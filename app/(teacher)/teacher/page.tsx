import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TeacherDashboardClient from "@/components/teacher/TeacherDashboardClient";

export default async function TeacherPage() {
  const session = await auth();
  const user = session?.user as any;
  if (!session || !["TEACHER", "SUPER_ADMIN"].includes(user?.role)) redirect("/login");

  const where = user.role === "TEACHER" ? { createdById: user.id } : {};
  const tests = await prisma.test.findMany({
    where,
    include: { _count: { select: { questions: true, attempts: true } } },
    orderBy: { createdAt: "desc" },
  });

  const testIds = tests.map((t: typeof tests[0]) => t.id);
  const attempts =
    testIds.length > 0
      ? await prisma.testAttempt.findMany({
          where: { testId: { in: testIds }, status: "SUBMITTED" },
          select: { percentage: true },
        })
      : [];

  const avgScore =
    attempts.length > 0
      ? Math.round((attempts.reduce((s: number, a: { percentage: number }) => s + a.percentage, 0) / attempts.length) * 10) / 10
      : 0;

  return (
    <TeacherDashboardClient
      tests={tests.map((t: typeof tests[0]) => ({
        ...t,
        questionsCount: t._count.questions,
        attemptsCount: t._count.attempts,
      }))}
      stats={{
        totalTests: tests.length,
        publishedTests: tests.filter((t: typeof tests[0]) => t.status === "PUBLISHED").length,
        totalStudents: 0,
        avgScore,
      }}
      userName={user.name || ""}
    />
  );
}
