import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateShareCode } from "@/lib/utils";

export async function POST(_: Request, { params }: { params: { testId: string } }) {
  const s = await auth();
  const u = s?.user as any;
  if (!s || !["TEACHER", "SUPER_ADMIN"].includes(u?.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const test = await prisma.test.findUnique({ where: { id: params.testId }, include: { questions: true } });
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newTitle = `${test.title} (Copy)`;
  const nt = await prisma.test.create({
    data: {
      title: newTitle,
      description: test.description,
      duration: test.duration,
      category: test.category,
      accessType: test.accessType,
      settings: test.settings as object,
      shareCode: generateShareCode(newTitle),
      createdById: u.id,
    },
  });

  for (const q of test.questions) {
    await prisma.question.create({
      data: {
        testId: nt.id,
        type: q.type,
        text: q.text,
        options: q.options as object,
        correctOption: q.correctOption,
        keywords: q.keywords as object,
        points: q.points,
        tags: q.tags,
        explanation: q.explanation,
        modelAnswer: q.modelAnswer,
        order: q.order,
      },
    });
  }

  return NextResponse.json({ id: nt.id });
}
