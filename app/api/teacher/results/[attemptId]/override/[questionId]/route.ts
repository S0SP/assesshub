import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function PUT(req:Request,{params}:{params:{attemptId:string,questionId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const {score,feedback}=await req.json();
  const a=await prisma.testAttempt.findUnique({where:{id:params.attemptId}});
  if(!a) return NextResponse.json({error:"Not found"},{status:404});
  const q=await prisma.question.findUnique({where:{id:params.questionId}});
  if(!q||score<0||score>q.points) return NextResponse.json({error:"Invalid score"},{status:400});
  const evaluation=a.evaluation as Record<string,any>;
  evaluation[params.questionId]={...(evaluation[params.questionId]||{}),score,manual_feedback:feedback,overridden:true,overriddenAt:new Date().toISOString(),overriddenBy:u.id};
  const totalScore=Object.values(evaluation).reduce((s:number,e:any)=>s+(e.score||0),0);
  const percentage=a.maxScore>0?Math.round(totalScore/a.maxScore*1000)/10:0;
  const updated=await prisma.testAttempt.update({where:{id:params.attemptId},data:{evaluation,totalScore,percentage}});
  return NextResponse.json({totalScore,percentage,evaluation});
}
