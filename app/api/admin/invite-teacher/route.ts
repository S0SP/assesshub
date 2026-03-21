import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma"; import { generateTeacherInviteCode } from "@/lib/utils";
export async function POST(req: Request) {
  const s = await auth(); if ((s?.user as any)?.role !== "SUPER_ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
  const {department} = await req.json().catch(()=>({}));
  const code = generateTeacherInviteCode();
  const inv = await prisma.teacherInvite.create({data:{code,department,expiresAt:new Date(Date.now()+7*86400000),createdById:(s!.user as any).id}});
  return NextResponse.json({code:inv.code,expiresAt:inv.expiresAt,id:inv.id});
}
export async function GET() {
  const s = await auth(); if ((s?.user as any)?.role !== "SUPER_ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
  return NextResponse.json(await prisma.teacherInvite.findMany({orderBy:{createdAt:"desc"}}));
}
