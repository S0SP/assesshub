import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { attemptId: string } }) {
  const s = await auth();
  const u = s?.user as any;
  if (!s || !["TEACHER", "SUPER_ADMIN"].includes(u?.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const attempt = await prisma.testAttempt.findUnique({ where: { id: params.attemptId } });
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentEval = (attempt.evaluation as Record<string, unknown>) || {};
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

  return NextResponse.json({ released: true });
}
