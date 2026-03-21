import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma"; import { generateTestInviteCode } from "@/lib/utils";
export async function GET(_:Request,{params}:{params:{testId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  return NextResponse.json(await prisma.testInviteCode.findMany({where:{testId:params.testId},orderBy:{createdAt:"desc"}}));
}
export async function POST(req:Request,{params}:{params:{testId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const {maxUses=50,expiresInDays=7,label}=await req.json();
  const c=await prisma.testInviteCode.create({data:{code:generateTestInviteCode(),testId:params.testId,maxUses,label,expiresAt:new Date(Date.now()+expiresInDays*86400000),createdById:u.id}});
  return NextResponse.json(c);
}
