import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TestShareClient from "@/components/teacher/TestShareClient";

export default async function SharePage({ params }: { params: { testId: string } }) {
  const session = await auth();
  if (!session || !["TEACHER","SUPER_ADMIN"].includes((session.user as any)?.role)) redirect("/login");
  const test = await prisma.test.findUnique({ where: { id: params.testId } });
  if (!test) redirect("/teacher");
  const codes = await prisma.testInviteCode.findMany({ where: { testId: params.testId }, orderBy: { createdAt: "desc" } });
  return <TestShareClient test={test} codes={codes} />;
}
