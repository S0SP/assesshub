import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
export async function POST(req: Request) {
  try {
    const { name, email, password, role = "TEST_TAKER", inviteCode, department } = await req.json();
    if (!name || !email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password min 8 chars" }, { status: 400 });
    if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    let finalRole: "TEST_TAKER" | "TEACHER" = "TEST_TAKER";
    let finalDept = department;
    if (role === "TEACHER") {
      if (!inviteCode) return NextResponse.json({ error: "Teacher invite code required" }, { status: 400 });
      const invite = await prisma.teacherInvite.findUnique({ where: { code: inviteCode } });
      if (!invite || invite.status !== "ACTIVE" || invite.expiresAt < new Date()) return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 400 });
      finalRole = "TEACHER";
      if (invite.department) finalDept = invite.department;
    }
    const user = await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: finalRole, department: finalDept } });
    if (role === "TEACHER" && inviteCode) await prisma.teacherInvite.update({ where: { code: inviteCode }, data: { status: "USED", usedById: user.id, usedAt: new Date() } });
    return NextResponse.json({ success: true, role: user.role });
  } catch (e: any) { return NextResponse.json({ error: e.message || "Failed" }, { status: 500 }); }
}
