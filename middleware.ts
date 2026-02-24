import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session_token";
const PROTECTED_PATHS = [
  "/dashboard",
  "/vault",
  "/asset-records",
  "/debt-records",
  "/assets",
  "/digital-legacy",
  "/wishes",
  "/checklist",
  "/settings",
  "/access",
  "/restore",
  "/",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;

  if (pathname.startsWith("/login") && sessionToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED_PATHS.some((path) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path),
  );
  if (!isProtected) return NextResponse.next();

  if (!sessionToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};
