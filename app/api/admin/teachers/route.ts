import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const s = await auth();
  if ((s?.user as any)?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    select: { id: true, name: true, email: true, department: true, isActive: true, createdAt: true, _count: { select: { tests: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(teachers.map((t: typeof teachers[0]) => ({ ...t, testsCount: t._count.tests })));
}
