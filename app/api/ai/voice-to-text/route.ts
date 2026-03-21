import { NextResponse } from "next/server"; import { auth } from "@/auth"; import { voiceToQuestion } from "@/lib/ai";
export async function POST(req:Request) {
  const s=await auth(); if(!s||!["TEACHER","SUPER_ADMIN"].includes((s.user as any)?.role)) return NextResponse.json({error:"Forbidden"},{status:403});
  const {transcript}=await req.json();
  if(!transcript) return NextResponse.json({error:"Transcript required"},{status:400});
  try { const improved=await voiceToQuestion(transcript); return NextResponse.json({question:improved}); }
  catch(e) { return NextResponse.json({error:"AI error"},{status:500}); }
}
