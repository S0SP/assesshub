import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 12;

export async function GET(req: Request) {
  const s = await auth();
  const u = s?.user as any;
  if (!s || u?.role !== "TEST_TAKER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") || undefined;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  const where: Record<string, unknown> = {
    status: "PUBLISHED",
    OR: [{ accessType: "PUBLIC" }, { accessType: "PASSWORD_PROTECTED" }],
  };
  if (search) where.title = { contains: search, mode: "insensitive" };
  if (category) where.category = category;

  const tests = await prisma.test.findMany({
    where,
    include: { _count: { select: { questions: true } }, createdBy: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = tests.length > PAGE_SIZE;
  const page = tests.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? page[page.length - 1]?.id : null;

  const attempts = await prisma.testAttempt.findMany({
    where: { userId: u.id },
    select: { testId: true, status: true, percentage: true, id: true },
  });
  const map = Object.fromEntries(attempts.map((a: typeof attempts[0]) => [a.testId, a]));

  return NextResponse.json({
    tests: page.map((t: typeof page[0]) => ({
      ...t,
      questionsCount: t._count.questions,
      createdByName: t.createdBy.name,
      userAttempt: map[t.id] || null,
    })),
    pagination: { hasMore, nextCursor },
  });
}
