import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TestCreateClient from "@/components/teacher/TestCreateClient";

export default async function CreateTestPage() {
  const session = await auth();
  if (!session || !["TEACHER","SUPER_ADMIN"].includes((session.user as any)?.role)) redirect("/login");
  return <TestCreateClient />;
}
