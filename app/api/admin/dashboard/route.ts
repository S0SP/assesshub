import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function GET() {
  const s = await auth(); if ((s?.user as any)?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [teachers,students,tests,attempts] = await Promise.all([prisma.user.count({where:{role:"TEACHER"}}),prisma.user.count({where:{role:"TEST_TAKER"}}),prisma.test.count(),prisma.testAttempt.count()]);
  return NextResponse.json({teachers,students,tests,attempts});
}
