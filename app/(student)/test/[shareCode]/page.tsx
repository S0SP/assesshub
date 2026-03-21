import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import PublicTestLandingClient from "@/components/student/PublicTestLandingClient";
import { notFound } from "next/navigation";

export default async function PublicTestPage({ params }: { params: { shareCode: string } }) {
  const test = await prisma.test.findUnique({
    where: { shareCode: params.shareCode, status: "PUBLISHED" },
    include: {
      questions: { select: { id: true, type: true, points: true, tags: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!test) notFound();

  const session = await auth();
  let existingAttempt = null;
  if (session && (session.user as any).role === "TEST_TAKER") {
    existingAttempt = await prisma.testAttempt.findUnique({
      where: { testId_userId: { testId: test.id, userId: (session.user as any).id } },
    });
  }

  const tags = Array.from(new Set<string>(test.questions.flatMap((q: { tags: string[] }) => q.tags)));

  return (
    <PublicTestLandingClient
      test={{
        ...test,
        createdByName: test.createdBy.name,
        mcqCount: test.questions.filter((q: { type: string }) => q.type === "MCQ").length,
        subjectiveCount: test.questions.filter((q: { type: string }) => q.type !== "MCQ").length,
        tags,
      }}
      existingAttempt={existingAttempt}
      isLoggedIn={!!session}
      userRole={(session?.user as any)?.role}
    />
  );
}
