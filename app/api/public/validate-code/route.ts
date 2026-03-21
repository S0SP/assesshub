import { NextResponse } from "next/server"; import { prisma } from "@/lib/prisma";
export async function POST(req:Request) {
  const {code}=await req.json();
  if(code?.startsWith("TCH-")) {
    const inv=await prisma.teacherInvite.findUnique({where:{code}});
    if(!inv||inv.status!=="ACTIVE"||inv.expiresAt<new Date()) return NextResponse.json({valid:false,type:"teacher",error:"Invalid or expired code"});
    return NextResponse.json({valid:true,type:"teacher",code,department:inv.department});
  }
  if(code?.startsWith("TEST-")) {
    const c=await prisma.testInviteCode.findUnique({where:{code},include:{test:{select:{shareCode:true,title:true}}}});
    if(!c||c.status!=="ACTIVE"||c.expiresAt<new Date()||c.currentUses>=c.maxUses) return NextResponse.json({valid:false,type:"test",error:"Invalid or exhausted code"});
    return NextResponse.json({valid:true,type:"test",code,testTitle:c.test.title,shareCode:c.test.shareCode});
  }
  return NextResponse.json({valid:false,error:"Unknown code format"});
}
