import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminDashboardClient from "@/components/shared/AdminDashboardClient";

export default async function AdminPage() {
  const session = await auth();
  if (!session || (session.user as any).role !== "SUPER_ADMIN") redirect("/login");

  const [teachers, students, tests, attempts] = await Promise.all([
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "TEST_TAKER" } }),
    prisma.test.count(),
    prisma.testAttempt.count(),
  ]);

  const teacherList = await prisma.user.findMany({
    where: { role: "TEACHER" },
    select: {
      id: true, name: true, email: true, department: true,
      isActive: true, createdAt: true,
      _count: { select: { tests: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const invites = await prisma.teacherInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AdminDashboardClient
      stats={{ teachers, students, tests, attempts }}
      teacherList={teacherList.map((t: typeof teacherList[0]) => ({ ...t, testsCount: t._count.tests }))}
      invites={invites}
      adminName={(session.user as any).name || "Admin"}
    />
  );
}
