import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { generateKeywords } from "@/lib/ai";
export async function POST(req:Request) {
  const s=await auth(); if(!s||!["TEACHER","SUPER_ADMIN"].includes((s.user as any)?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const {text,modelAnswer}=await req.json();
  if(!text) return NextResponse.json({error:"Text required"},{status:400});
  try { const kws=await generateKeywords(text,modelAnswer); return NextResponse.json(kws); }
  catch(e) { return NextResponse.json({error:"AI error"},{status:500}); }
}
