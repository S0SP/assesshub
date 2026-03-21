import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TestResultsClient from "@/components/teacher/TestResultsClient";

const PAGE_SIZE = 20;

export default async function TestResultsPage({ params }: { params: { testId: string } }) {
  const session = await auth();
  if (!session || !["TEACHER", "SUPER_ADMIN"].includes((session.user as any)?.role)) redirect("/login");

  const test = await prisma.test.findUnique({
    where: { id: params.testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) redirect("/teacher");

  const allAttempts = await prisma.testAttempt.findMany({
    where: { testId: params.testId, status: "SUBMITTED" },
    select: { percentage: true },
  });

  const stats =
    allAttempts.length > 0
      ? {
          total: allAttempts.length,
          avg:
            Math.round(
              (allAttempts.reduce((s: number, a: { percentage: number }) => s + a.percentage, 0) / allAttempts.length) * 10
            ) / 10,
          highest: Math.max(...allAttempts.map((a: { percentage: number }) => a.percentage)),
          lowest: Math.min(...allAttempts.map((a: { percentage: number }) => a.percentage)),
        }
      : { total: 0, avg: 0, highest: 0, lowest: 0 };

  const attempts = await prisma.testAttempt.findMany({
    where: { testId: params.testId, status: "SUBMITTED" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { submittedAt: "desc" },
    take: PAGE_SIZE + 1,
  });

  const hasMore = attempts.length > PAGE_SIZE;
  const page = attempts.slice(0, PAGE_SIZE);

  return (
    <TestResultsClient
      test={test}
      questions={test.questions}
      attempts={page.map((a: typeof page[0]) => ({
        ...a,
        userName: a.user.name,
        userEmail: a.user.email,
      }))}
      stats={stats}
      pagination={{
        hasMore,
        nextCursor: hasMore ? page[page.length - 1]?.id : null,
        total: allAttempts.length,
      }}
    />
  );
}
