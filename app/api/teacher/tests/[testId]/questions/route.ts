import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function POST(req:Request,{params}:{params:{testId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const test=await prisma.test.findUnique({where:{id:params.testId}});
  if(!test||(u.role==="TEACHER"&&test.createdById!==u.id)) return NextResponse.json({error:"Not found"},{status:404});
  const b=await req.json(); const count=await prisma.question.count({where:{testId:params.testId}});
  const q=await prisma.question.create({data:{testId:params.testId,type:b.type,text:b.text,options:b.options,correctOption:b.correctOption,keywords:b.keywords,points:b.points||1,tags:b.tags||[],explanation:b.explanation,modelAnswer:b.modelAnswer,order:count}});
  const total=await prisma.question.aggregate({where:{testId:params.testId},_sum:{points:true}});
  await prisma.test.update({where:{id:params.testId},data:{totalPoints:total._sum.points||0}});
  return NextResponse.json(q);
}
