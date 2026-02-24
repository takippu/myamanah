import { NextResponse } from "next/server";
import { accessSetupCookieName, getAuthUserFromRequest } from "@/lib/auth";

export async function POST() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(accessSetupCookieName(), "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(accessSetupCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

