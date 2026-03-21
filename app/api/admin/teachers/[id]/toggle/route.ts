import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { prisma } from "@/lib/prisma";
export async function PUT(_: Request, {params}:{params:{id:string}}) {
  const s = await auth(); if ((s?.user as any)?.role !== "SUPER_ADMIN") return NextResponse.json({error:"Forbidden"},{status:403});
  const t = await prisma.user.findUnique({where:{id:params.id}}); if(!t) return NextResponse.json({error:"Not found"},{status:404});
  const u = await prisma.user.update({where:{id:params.id},data:{isActive:!t.isActive}});
  return NextResponse.json({isActive:u.isActive});
}
