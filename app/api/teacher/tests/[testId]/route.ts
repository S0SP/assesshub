import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
async function getTest(testId:string,userId:string,role:string) {
  const t = await prisma.test.findUnique({where:{id:testId},include:{questions:{orderBy:{order:"asc"}},_count:{select:{attempts:true}}}});
  if(!t||(role==="TEACHER"&&t.createdById!==userId)) return null; return t;
}
export async function GET(_:Request,{params}:{params:{testId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const t=await getTest(params.testId,u.id,u.role); if(!t) return NextResponse.json({error:"Not found"},{status:404});
  return NextResponse.json({...t,questionsCount:t.questions.length,attemptsCount:t._count.attempts});
}
export async function PUT(req:Request,{params}:{params:{testId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const t=await getTest(params.testId,u.id,u.role); if(!t) return NextResponse.json({error:"Not found"},{status:404});
  const b=await req.json();
  const updated=await prisma.test.update({where:{id:params.testId},data:{title:b.title,description:b.description,duration:b.duration,category:b.category,accessType:b.accessType,testPassword:b.testPassword||null,settings:b.settings}});
  return NextResponse.json(updated);
}
export async function DELETE(_:Request,{params}:{params:{testId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const t=await getTest(params.testId,u.id,u.role); if(!t) return NextResponse.json({error:"Not found"},{status:404});
  if(t.status!=="DRAFT") return NextResponse.json({error:"Only draft tests can be deleted"},{status:400});
  await prisma.test.delete({where:{id:params.testId}}); return NextResponse.json({success:true});
}
