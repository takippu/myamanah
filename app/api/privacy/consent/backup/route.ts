import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const consent = await prisma.userPrivacyConsent.findUnique({ where: { userId: user.id } });
  return NextResponse.json({
    backupEnabled: Boolean(consent?.backupEnabled),
    consentedAt: consent?.consentedAt ?? null,
    revokedAt: consent?.revokedAt ?? null,
  });
}

export async function POST() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const consent = await prisma.userPrivacyConsent.upsert({
    where: { userId: user.id },
    update: {
      backupEnabled: true,
      consentedAt: now,
      revokedAt: null,
    },
    create: {
      userId: user.id,
      backupEnabled: true,
      consentedAt: now,
      revokedAt: null,
    },
  });

  return NextResponse.json({
    backupEnabled: consent.backupEnabled,
    consentedAt: consent.consentedAt,
    revokedAt: consent.revokedAt,
  });
}

export async function DELETE() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  await prisma.userPrivacyConsent.upsert({
    where: { userId: user.id },
    update: {
      backupEnabled: false,
      revokedAt: now,
    },
    create: {
      userId: user.id,
      backupEnabled: false,
      revokedAt: now,
    },
  });

  await prisma.vault.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ backupEnabled: false, revokedAt: now });
}
