import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  generateSessionToken,
  hashSessionToken,
  sessionCookieName,
  verifyOtpHash,
} from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Invalid code" }, { status: 401 });

  const otp = await prisma.emailOtp.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return NextResponse.json({ error: "Code expired or invalid" }, { status: 401 });
  if (otp.attempts >= 5) {
    return NextResponse.json(
      { error: "Too many attempts. Request a new OTP." },
      { status: 429 },
    );
  }
  if (!verifyOtpHash(email, parsed.data.code, otp.codeHash)) {
    const updatedOtp = await prisma.emailOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    if (updatedOtp.attempts >= 5) {
      await prisma.emailOtp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
    }
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  await prisma.emailOtp.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  });

  const sessionToken = generateSessionToken();
  const tokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(sessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });
  return res;
}
