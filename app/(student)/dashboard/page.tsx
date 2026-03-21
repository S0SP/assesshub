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

  // Get ALL attempts for this user, ordered newest first
  const attempts = await prisma.testAttempt.findMany({
    where: { userId },
    include: { test: { select: { title: true, duration: true } } },
    orderBy: { createdAt: "desc" },
  });

  // For each test, keep only the most recent attempt (newest first due to ordering)
  const attemptMap: Record<string, { id: string; status: string; percentage: number }> = {};
  for (const a of attempts) {
    // First occurrence = most recent (because ordered by createdAt desc)
    if (!attemptMap[a.testId]) {
      attemptMap[a.testId] = { id: a.id, status: a.status, percentage: a.percentage };
    }
  }

  // Results = all submitted attempts (for the My Results tab)
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
