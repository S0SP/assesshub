import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function POST(_:Request,{params}:{params:{testId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const count=await prisma.question.count({where:{testId:params.testId}});
  if(count===0) return NextResponse.json({error:"Add at least one question"},{status:400});
  const t=await prisma.test.update({where:{id:params.testId},data:{status:"PUBLISHED"}});
  return NextResponse.json({shareCode:t.shareCode});
}
