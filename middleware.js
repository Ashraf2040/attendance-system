import { NextResponse } from "next/server";

export function middleware(request) {
  console.log('Middleware triggered for:', request.nextUrl.pathname);
  console.log('Cookie teacherId:', request.cookies.get("teacherId")?.value);

  const teacherId = request.cookies.get("teacherId")?.value;
  if (!teacherId && (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin"))) {
    console.log('No teacherId, redirecting to /login');
    return NextResponse.redirect(new URL("/login", request.url));
  }
  console.log('Allowing request to proceed');
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};