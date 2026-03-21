import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = (user as any).role; }
      return token;
    },
    async session({ session, token }) {
      if (token) { (session.user as any).id = token.id; (session.user as any).role = token.role; }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c) {
        const user = await prisma.user.findUnique({ where: { email: c.email as string } });
        if (!user || !user.isActive) return null;
        if (!(await bcrypt.compare(c.password as string, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
      },
    }),
  ],
});
