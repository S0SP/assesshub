import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function POST(req:Request,{params}:{params:{attemptId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||u?.role!=="TEST_TAKER") return NextResponse.json({error:"Forbidden"},{status:403});
  const a=await prisma.testAttempt.findUnique({where:{id:params.attemptId}});
  if(!a||a.userId!==u.id||a.status!=="IN_PROGRESS") return NextResponse.json({error:"Not found"},{status:404});
  const {answers}=await req.json();
  await prisma.testAttempt.update({where:{id:params.attemptId},data:{answers}});
  return NextResponse.json({saved:true,savedAt:new Date().toISOString()});
}
