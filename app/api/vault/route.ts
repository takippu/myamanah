import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptedVaultPayloadSchema } from "@/lib/vault-schema";
import { getAuthUserFromRequest } from "@/lib/auth";

async function hasBackupConsent(userId: string) {
  const consent = await prisma.userPrivacyConsent.findUnique({ where: { userId } });
  return Boolean(consent?.backupEnabled);
}

export async function GET() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasBackupConsent(user.id))) {
    return NextResponse.json({ error: "Backup consent required" }, { status: 403 });
  }

  const vault = await prisma.vault.findUnique({ where: { userId: user.id } });
  if (!vault) {
    return NextResponse.json({ error: "Vault not found" }, { status: 404 });
  }

  return NextResponse.json({
    ciphertext: vault.ciphertext,
    iv: vault.iv,
    authTag: vault.authTag,
    wrappedDekPass: vault.wrappedDekPass,
    wrappedDekRecovery: vault.wrappedDekRecovery,
    saltPass: vault.saltPass,
    saltRecovery: vault.saltRecovery,
    kdfParams: vault.kdfParams,
    schemaVersion: vault.schemaVersion,
    recoveryVerifiedAt: vault.recoveryVerifiedAt,
    updatedAt: vault.updatedAt,
  });
}

export async function PUT(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasBackupConsent(user.id))) {
    return NextResponse.json({ error: "Backup consent required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = encryptedVaultPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid encrypted payload" }, { status: 400 });
  }

  const updated = await prisma.vault.upsert({
    where: { userId: user.id },
    update: {
      ...parsed.data,
    },
    create: {
      userId: user.id,
      ...parsed.data,
    },
  });

  return NextResponse.json({
    userId: updated.userId,
    schemaVersion: updated.schemaVersion,
    updatedAt: updated.updatedAt,
  });
}

export async function DELETE() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.vault.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
