import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function PUT(req:Request,{params}:{params:{testId:string,questionId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const b=await req.json();
  const q=await prisma.question.update({where:{id:params.questionId},data:{type:b.type,text:b.text,options:b.options,correctOption:b.correctOption,keywords:b.keywords,points:b.points,tags:b.tags||[],explanation:b.explanation,modelAnswer:b.modelAnswer}});
  const total=await prisma.question.aggregate({where:{testId:params.testId},_sum:{points:true}});
  await prisma.test.update({where:{id:params.testId},data:{totalPoints:total._sum.points||0}});
  return NextResponse.json(q);
}
export async function DELETE(_:Request,{params}:{params:{testId:string,questionId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  await prisma.question.delete({where:{id:params.questionId}});
  const total=await prisma.question.aggregate({where:{testId:params.testId},_sum:{points:true}});
  await prisma.test.update({where:{id:params.testId},data:{totalPoints:total._sum.points||0}});
  return NextResponse.json({success:true});
}
