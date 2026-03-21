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

  const settings = test.settings as any;
  const allowMultiple = settings?.allow_multiple_attempts === true;
  const shouldRandomize = settings?.randomize_questions === true;

  // Find the most recent attempt (IN_PROGRESS or SUBMITTED)
  const latestAttempt = await prisma.testAttempt.findFirst({
    where: { testId: params.testId, userId: u.id },
    orderBy: { createdAt: "desc" },
  });

  if (latestAttempt) {
    // Resume an in-progress attempt regardless of allowMultiple
    if (latestAttempt.status === "IN_PROGRESS") {
      let safeQs = test.questions.map(({ correctOption: _c, keywords: _k, modelAnswer: _m, ...q }) => q);
      if (shouldRandomize) safeQs = shuffleArray(safeQs);
      return NextResponse.json({
        attemptId: latestAttempt.id,
        questions: safeQs,
        answers: latestAttempt.answers,
        startedAt: latestAttempt.startedAt,
        duration: test.duration,
        test: { title: test.title, settings: test.settings },
      });
    }

    // Latest attempt is SUBMITTED — check if re-attempt is allowed
    if (!allowMultiple) {
      return NextResponse.json({ error: "You have already completed this test. Multiple attempts are not allowed." }, { status: 400 });
    }
    // allowMultiple = true → fall through to create a new attempt
  }

  // Create a new attempt
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
