import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accessSetupCookieName, hashSessionToken, sessionCookieName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  if (token) {
    await prisma.session
      .delete({ where: { tokenHash: hashSessionToken(token) } })
      .catch(() => null);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  res.cookies.set(accessSetupCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
