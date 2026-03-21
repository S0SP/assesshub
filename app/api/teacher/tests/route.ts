import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateShareCode } from "@/lib/utils";

const checkTeacher = async () => {
  const s = await auth();
  const u = s?.user as any;
  if (!s || !["TEACHER", "SUPER_ADMIN"].includes(u?.role)) return null;
  return u;
};

export async function GET() {
  const u = await checkTeacher();
  if (!u) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const where = u.role === "TEACHER" ? { createdById: u.id } : {};
  const tests = await prisma.test.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, attempts: true } } },
  });
  return NextResponse.json(tests.map((t: typeof tests[0]) => ({ ...t, questionsCount: t._count.questions, attemptsCount: t._count.attempts })));
}

export async function POST(req: Request) {
  const u = await checkTeacher();
  if (!u) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json();
  const test = await prisma.test.create({
    data: {
      title: b.title,
      description: b.description || "",
      duration: b.duration || 30,
      category: b.category || "General",
      accessType: b.accessType || "PUBLIC",
      testPassword: b.testPassword,
      settings: b.settings || {},
      shareCode: generateShareCode(b.title),
      createdById: u.id,
    },
  });
  return NextResponse.json(test);
}
