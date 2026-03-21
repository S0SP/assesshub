import { auth } from "@/auth";
import { NextResponse } from "next/server";
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user as any;
  const pub = ["/", "/login", "/register", "/test/", "/join/", "/api/auth", "/api/public"];
  if (pub.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (!req.auth) return NextResponse.redirect(new URL("/login", req.url));
  if (pathname.startsWith("/admin") && user?.role !== "SUPER_ADMIN") return NextResponse.redirect(new URL("/", req.url));
  if (pathname.startsWith("/teacher") && !["TEACHER","SUPER_ADMIN"].includes(user?.role)) return NextResponse.redirect(new URL("/dashboard", req.url));
  if (pathname.startsWith("/dashboard") && user?.role !== "TEST_TAKER") {
    if (user?.role === "TEACHER") return NextResponse.redirect(new URL("/teacher", req.url));
    if (user?.role === "SUPER_ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
  }
  return NextResponse.next();
});
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
