import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { attemptId: string } }) {
  const s = await auth();
  const u = s?.user as any;
  if (!s || u?.role !== "TEST_TAKER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const a = await prisma.testAttempt.findUnique({
    where: { id: params.attemptId },
    include: { test: { include: { questions: { orderBy: { order: "asc" } } } } },
  });
  if (!a || a.userId !== u.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = a.test.settings as any;
  const showImmediately = settings?.show_results_immediately !== false;
  const evaluation = (a.evaluation as Record<string, any>) || {};
  const teacherReleased = evaluation._released === true;

  if (!showImmediately && !teacherReleased) {
    return NextResponse.json(
      { error: "Results will be available after your teacher reviews the submission", pending: true },
      { status: 403 }
    );
  }

  return NextResponse.json({ attempt: a, test: a.test, questions: a.test.questions });
}
