import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOtpCode, hashOtp } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mailer";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const latestOtp = await prisma.emailOtp.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (latestOtp) {
    const secondsSinceLast = Math.floor((Date.now() - latestOtp.createdAt.getTime()) / 1000);
    const cooldownSeconds = 60;
    if (secondsSinceLast < cooldownSeconds) {
      return NextResponse.json(
        { error: "Please wait before requesting another OTP.", retryAfterSec: cooldownSeconds - secondsSinceLast },
        { status: 429 },
      );
    }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const requestCountLastHour = await prisma.emailOtp.count({
    where: { userId: user.id, createdAt: { gte: oneHourAgo } },
  });
  if (requestCountLastHour >= 5) {
    return NextResponse.json(
      { error: "Too many OTP requests. Try again later.", retryAfterSec: 3600 },
      { status: 429 },
    );
  }

  const code = generateOtpCode();
  const codeHash = hashOtp(email, code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.emailOtp.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt,
    },
  });

  await sendOtpEmail(email, code);
  return NextResponse.json({ ok: true, cooldownSec: 60 });
}
