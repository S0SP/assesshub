import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function PUT(_: Request, {params}:{params:{code:string}}) {
  const s = await auth(); if ((s?.user as any)?.role !== "SUPER_ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
  await prisma.teacherInvite.update({where:{code:params.code},data:{status:"REVOKED"}});
  return NextResponse.json({success:true});
}
