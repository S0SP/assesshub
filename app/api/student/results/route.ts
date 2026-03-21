import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const s = await auth();
  const u = s?.user as any;
  if (!s || u?.role !== "TEST_TAKER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const attempts = await prisma.testAttempt.findMany({
    where: { userId: u.id, status: "SUBMITTED" },
    include: { test: { select: { title: true, duration: true } } },
    orderBy: { submittedAt: "desc" },
  });
  return NextResponse.json(attempts.map((a: typeof attempts[0]) => ({ ...a, testTitle: a.test.title })));
}
