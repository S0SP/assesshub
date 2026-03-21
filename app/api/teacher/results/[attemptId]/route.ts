import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { attemptId: string } }) {
  const s = await auth();
  const u = s?.user as any;
  if (!s || !["TEACHER", "SUPER_ADMIN"].includes(u?.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const a = await prisma.testAttempt.findUnique({
    where: { id: params.attemptId },
    include: {
      user: { select: { name: true, email: true } },
      test: { include: { questions: { orderBy: { order: "asc" } } } },
    },
  });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mark results as released when teacher reviews this attempt.
  // This allows students to see results even when show_results_immediately is OFF.
  const currentEval = (a.evaluation as Record<string, unknown>) || {};
  if (!currentEval._released) {
    await prisma.testAttempt.update({
      where: { id: params.attemptId },
      data: {
        evaluation: {
          ...currentEval,
          _released: true,
          _releasedAt: new Date().toISOString(),
          _releasedBy: u.id,
        },
      },
    });
  }

  return NextResponse.json({
    attempt: { ...a, userName: a.user.name, userEmail: a.user.email },
    test: a.test,
    questions: a.test.questions,
  });
}
