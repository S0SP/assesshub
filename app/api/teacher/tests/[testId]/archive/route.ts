import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function POST(_:Request,{params}:{params:{testId:string}}) {
  const s=await auth(); if(!["TEACHER","SUPER_ADMIN"].includes((s?.user as any)?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  await prisma.test.update({where:{id:params.testId},data:{status:"ARCHIVED"}});
  return NextResponse.json({success:true});
}
