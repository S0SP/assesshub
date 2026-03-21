import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StudentDashboardClient from "@/components/student/StudentDashboardClient";

const PAGE_SIZE = 12;

export default async function StudentDashboard() {
  const session = await auth();
  if (!session || (session.user as any).role !== "TEST_TAKER") redirect("/login");
  const userId = (session.user as any).id;

  const tests = await prisma.test.findMany({
    where: { status: "PUBLISHED", OR: [{ accessType: "PUBLIC" }, { accessType: "PASSWORD_PROTECTED" }] },
    include: { _count: { select: { questions: true } }, createdBy: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: PAGE_SIZE + 1,
  });

  const hasMore = tests.length > PAGE_SIZE;
  const page = tests.slice(0, PAGE_SIZE);

  const attempts = await prisma.testAttempt.findMany({
    where: { userId },
    include: { test: { select: { title: true, duration: true } } },
    orderBy: { createdAt: "desc" },
  });

  const attemptMap = Object.fromEntries(
    attempts.map((a: typeof attempts[0]) => [a.testId, { id: a.id, status: a.status, percentage: a.percentage }])
  );
  const results = attempts
    .filter((a: typeof attempts[0]) => a.status === "SUBMITTED")
    .map((a: typeof attempts[0]) => ({ ...a, testTitle: a.test.title }));

  return (
    <StudentDashboardClient
      tests={page.map((t: typeof page[0]) => ({
        ...t,
        questionsCount: t._count.questions,
        createdByName: t.createdBy.name,
        userAttempt: attemptMap[t.id] || null,
      }))}
      results={results}
      userName={(session.user as any).name || ""}
      pagination={{ hasMore, nextCursor: hasMore ? page[page.length - 1]?.id : null }}
    />
  );
}
