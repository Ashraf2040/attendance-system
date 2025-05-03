import { NextResponse } from "next/server";

export function middleware(request) {
  // In a real app, check a session token or cookie
  // For this mock, rely on a cookie set after login
  const teacherId = request.cookies.get("teacherId")?.value;
  if (!teacherId && (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};