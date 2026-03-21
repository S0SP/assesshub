import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import SessionProvider from "@/components/shared/SessionProvider";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "AssessHub — Assess. Evaluate. Improve.",
  description: "Modern assessment platform for educators and students",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        <SessionProvider session={session}>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </SessionProvider>
      </body>
    </html>
  );
}
