import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function GET(_:Request,{params}:{params:{attemptId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const a=await prisma.testAttempt.findUnique({where:{id:params.attemptId},include:{user:{select:{name:true,email:true}},test:{include:{questions:{orderBy:{order:"asc"}}}}}});
  if(!a) return NextResponse.json({error:"Not found"},{status:404});
  return NextResponse.json({attempt:{...a,userName:a.user.name,userEmail:a.user.email},test:a.test,questions:a.test.questions});
}
