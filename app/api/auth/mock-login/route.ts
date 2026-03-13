import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const enabled =
    process.env.MOCK_LOGIN_ENABLED === "true" || process.env.NODE_ENV !== "production";

  if (!enabled) {
    return NextResponse.json({ error: "Mock login is disabled." }, { status: 403 });
  }

  const email = process.env.MOCK_LOGIN_EMAIL ?? "demo@myamanah.local";
  const name = process.env.MOCK_LOGIN_NAME ?? "Demo User";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      emailVerified: true,
    },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name },
  });

  response.cookies.set("better-auth.session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return response;
}
