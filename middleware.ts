import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";

// App pages need a signed-in session; the login and signup pages send signed-in users onward.
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = (await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value)) !== null;
  if (pathname === "/login" || pathname === "/signup")
    return signedIn ? NextResponse.redirect(new URL("/dashboard", request.url)) : NextResponse.next();
  if (signedIn) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/pay/:path*", "/group/:path*", "/contract/:path*", "/verify/:path*", "/login", "/signup"],
};
