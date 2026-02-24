import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  accessSetupCookieName,
  generateSessionToken,
  hashSessionToken,
  sessionCookieName,
} from "@/lib/auth";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sessionToken = generateSessionToken();
  let dbBacked = true;
  try {
    const email = "mock.user@myamanah.local";
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await prisma.session.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
  } catch {
    dbBacked = false;
  }

  const res = NextResponse.json({ ok: true, mode: dbBacked ? "db-session" : "cookie-only" });
  res.cookies.set(sessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });
  res.cookies.set(accessSetupCookieName(), "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });

  return res;
}
