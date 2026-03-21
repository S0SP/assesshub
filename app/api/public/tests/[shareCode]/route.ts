import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { shareCode: string } }) {
  const test = await prisma.test.findUnique({
    where: { shareCode: params.shareCode, status: "PUBLISHED" },
    include: {
      questions: true,
      _count: { select: { questions: true, attempts: true } },
    },
  });
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tags = Array.from(new Set<string>(test.questions.flatMap((q: { tags: string[] }) => q.tags)));
  return NextResponse.json({
    id: test.id,
    title: test.title,
    description: test.description,
    duration: test.duration,
    questionsCount: test._count.questions,
    totalPoints: test.totalPoints,
    createdByName: "",
    category: test.category,
    accessType: test.accessType,
    mcqCount: test.questions.filter((q: { type: string }) => q.type === "MCQ").length,
    subjectiveCount: test.questions.filter((q: { type: string }) => q.type !== "MCQ").length,
    tags,
    settings: test.settings,
  });
}
