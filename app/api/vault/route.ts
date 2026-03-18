import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  storeVaultBackup,
  getVaultBackup,
  deleteVaultBackup,
} from "@/lib/sqlite-backup";
import { recordReleaseAuditEvent } from "@/lib/release-audit";
import { encryptedVaultPayloadSchema } from "@/lib/vault-schema";
import { getAuthUserFromRequest } from "@/lib/auth";

async function hasBackupConsent(userId: string) {
  const consent = await prisma.userPrivacyConsent.findUnique({ where: { userId } });
  return Boolean(consent?.backupEnabled);
}

/**
 * GET /api/vault
 * Download encrypted vault backup from SQLite
 */
export async function GET() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasBackupConsent(user.id))) {
    return NextResponse.json({ error: "Backup consent required" }, { status: 403 });
  }

  const backup = await getVaultBackup(user.id);
  if (!backup) {
    return NextResponse.json({ error: "Vault not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...backup.payload,
    recoveryVerifiedAt: backup.metadata.recoveryVerifiedAt,
    updatedAt: backup.metadata.lastBackedUpAt,
  });
}

/**
 * PUT /api/vault
 * Store encrypted vault backup in SQLite
 */
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

  const metadata = await storeVaultBackup(user.id, parsed.data);
  await recordReleaseAuditEvent({ userId: user.id, type: "backup_uploaded" });

  return NextResponse.json({
    userId: metadata.userId,
    schemaVersion: parsed.data.schemaVersion,
    updatedAt: metadata.lastBackedUpAt,
  });
}

/**
 * DELETE /api/vault
 * Delete encrypted vault backup from SQLite
 */
export async function DELETE() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasBackup = await prisma.vaultBackup.findUnique({
    where: { userId: user.id },
  });
  
  if (hasBackup) {
    await deleteVaultBackup(user.id);
    await recordReleaseAuditEvent({ userId: user.id, type: "backup_deleted" });
  }
  
  return NextResponse.json({ ok: true });
}
