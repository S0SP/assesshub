import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  const existing = await prisma.user.findUnique({ where: { email: "admin@assesshub.com" } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: "Platform Admin",
        email: "admin@assesshub.com",
        passwordHash: await bcrypt.hash("Admin@123", 12),
        role: "SUPER_ADMIN",
        department: "Administration",
      },
    });
    console.log("✅ Super Admin seeded: admin@assesshub.com / Admin@123");
  } else {
    console.log("ℹ️  Super Admin already exists");
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
