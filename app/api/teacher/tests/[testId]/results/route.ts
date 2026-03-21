import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(req: Request, { params }: { params: { testId: string } }) {
  const s = await auth();
  const u = s?.user as any;
  if (!s || !["TEACHER", "SUPER_ADMIN"].includes(u?.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") || undefined;
  const search = searchParams.get("search") || "";
  const sortBy = (searchParams.get("sort") || "submittedAt") as "submittedAt" | "percentage" | "totalScore";
  const order = (searchParams.get("order") || "desc") as "asc" | "desc";

  const test = await prisma.test.findUnique({
    where: { id: params.testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (u.role === "TEACHER" && test.createdById !== u.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allAttempts = await prisma.testAttempt.findMany({
    where: { testId: params.testId, status: "SUBMITTED" },
    select: { percentage: true },
  });

  const stats =
    allAttempts.length > 0
      ? {
          total: allAttempts.length,
          avg:
            Math.round(
              (allAttempts.reduce((s: number, a: { percentage: number }) => s + a.percentage, 0) / allAttempts.length) *
                10
            ) / 10,
          highest: Math.max(...allAttempts.map((a: { percentage: number }) => a.percentage)),
          lowest: Math.min(...allAttempts.map((a: { percentage: number }) => a.percentage)),
        }
      : { total: 0, avg: 0, highest: 0, lowest: 0 };

  const where: Record<string, unknown> = { testId: params.testId, status: "SUBMITTED" };
  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const attempts = await prisma.testAttempt.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ [sortBy]: order }, { id: "asc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = attempts.length > PAGE_SIZE;
  const page = attempts.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? page[page.length - 1]?.id : null;

  return NextResponse.json({
    test,
    attempts: page.map((a: typeof page[0]) => ({
      ...a,
      userName: a.user.name,
      userEmail: a.user.email,
    })),
    stats,
    questions: test.questions,
    pagination: { hasMore, nextCursor, pageSize: PAGE_SIZE, total: allAttempts.length },
  });
}
