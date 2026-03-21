import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { attemptId: string } }) {
  const s = await auth();
  const u = s?.user as any;
  if (!s || u?.role !== "TEST_TAKER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: params.attemptId },
    include: { test: { select: { duration: true } } },
  });
  if (!attempt || attempt.userId !== u.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.status === "SUBMITTED") return NextResponse.json({ remainingSeconds: 0, status: "SUBMITTED" });

  const deadlineMs = attempt.startedAt.getTime() + attempt.test.duration * 60 * 1000;
  const remainingSeconds = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
  return NextResponse.json({ remainingSeconds, status: "IN_PROGRESS" });
}
