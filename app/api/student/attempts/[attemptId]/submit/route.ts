import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAttemptAsync } from "@/lib/evaluate";

export async function POST(req: Request, { params }: { params: { attemptId: string } }) {
  const s = await auth();
  const u = s?.user as any;
  if (!s || u?.role !== "TEST_TAKER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const attempt = await prisma.testAttempt.findUnique({ where: { id: params.attemptId } });
  if (!attempt || attempt.userId !== u.id || attempt.status !== "IN_PROGRESS")
    return NextResponse.json({ error: "Attempt not found or already submitted" }, { status: 404 });

  // Check server-side deadline enforcement
  const test = await prisma.test.findUnique({ where: { id: attempt.testId } });
  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const deadlineMs = attempt.startedAt.getTime() + test.duration * 60 * 1000;
  const isExpired = Date.now() > deadlineMs + 30000; // 30s grace period
  if (isExpired) return NextResponse.json({ error: "Test time has expired" }, { status: 400 });

  const { answers: submittedAnswers } = await req.json().catch(() => ({}));
  const finalAnswers = submittedAnswers || (attempt.answers as any) || {};

  const questions = await prisma.question.findMany({
    where: { testId: attempt.testId },
    orderBy: { order: "asc" },
  });

  const settings = test.settings as any;
  const evalSettings = {
    negative_marking: settings?.negative_marking === true,
    negative_marks_value: settings?.negative_marks_value ?? 0.25,
    ai_grading: settings?.ai_grading === true,
  };

  const { evaluation, totalScore, maxScore, percentage } = await evaluateAttemptAsync(
    questions,
    finalAnswers,
    evalSettings
  );

  const timeTaken = Math.round((Date.now() - attempt.startedAt.getTime()) / 1000);

  await prisma.testAttempt.update({
    where: { id: params.attemptId },
    data: {
      status: "SUBMITTED",
      answers: finalAnswers,
      evaluation,
      totalScore,
      maxScore,
      percentage,
      timeTakenSeconds: Math.min(timeTaken, test.duration * 60),
      submittedAt: new Date(),
    },
  });

  return NextResponse.json({ attemptId: params.attemptId, totalScore, maxScore, percentage });
}
