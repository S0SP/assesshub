import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: Request, { params }: { params: { testId: string } }) {
  const s = await auth();
  const u = s?.user as any;
  if (!s || u?.role !== "TEST_TAKER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const test = await prisma.test.findUnique({
    where: { id: params.testId, status: "PUBLISHED" },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  if (test.accessType === "PASSWORD_PROTECTED" && b.testPassword !== test.testPassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  const existing = await prisma.testAttempt.findUnique({
    where: { testId_userId: { testId: params.testId, userId: u.id } },
  });
  const allowMultiple = (test.settings as any)?.allow_multiple_attempts;
  const shouldRandomize = (test.settings as any)?.randomize_questions === true;

  if (existing) {
    if (existing.status === "IN_PROGRESS") {
      let safeQs = test.questions.map(({ correctOption: _c, keywords: _k, modelAnswer: _m, ...q }) => q);
      if (shouldRandomize) safeQs = shuffleArray(safeQs);
      return NextResponse.json({
        attemptId: existing.id,
        questions: safeQs,
        answers: existing.answers,
        startedAt: existing.startedAt,
        duration: test.duration,
        test: { title: test.title, settings: test.settings },
      });
    }
    if (!allowMultiple) return NextResponse.json({ error: "Already attempted this test" }, { status: 400 });
  }

  const maxScore = test.questions.reduce((sum: number, q: { points: number }) => sum + q.points, 0);
  const attempt = await prisma.testAttempt.create({
    data: { testId: params.testId, userId: u.id, maxScore },
  });

  let safeQs = test.questions.map(({ correctOption: _c, keywords: _k, modelAnswer: _m, ...q }) => q);
  if (shouldRandomize) safeQs = shuffleArray(safeQs);
  return NextResponse.json({
    attemptId: attempt.id,
    questions: safeQs,
    answers: {},
    startedAt: attempt.startedAt,
    duration: test.duration,
    test: { title: test.title, settings: test.settings },
  });
}
