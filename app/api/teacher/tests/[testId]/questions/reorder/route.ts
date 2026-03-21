import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function PUT(req:Request,{params}:{params:{testId:string}}) {
  const s=await auth();const u=s?.user as any; if(!s||!["TEACHER","SUPER_ADMIN"].includes(u?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const {order}:{order:string[]}=await req.json();
  await Promise.all(order.map((id,i)=>prisma.question.update({where:{id},data:{order:i}})));
  return NextResponse.json({success:true});
}
