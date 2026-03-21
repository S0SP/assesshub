import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TestCreateClient from "@/components/teacher/TestCreateClient";

export default async function EditTestPage({ params }: { params: { testId: string } }) {
  const session = await auth();
  if (!session || !["TEACHER","SUPER_ADMIN"].includes((session.user as any)?.role)) redirect("/login");
  const test = await prisma.test.findUnique({ where: { id: params.testId }, include: { questions: { orderBy: { order: "asc" } } } });
  if (!test) redirect("/teacher");
  return <TestCreateClient test={test} />;
}
