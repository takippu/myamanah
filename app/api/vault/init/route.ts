import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storeVaultBackup } from "@/lib/sqlite-backup";
import { recordReleaseAuditEvent } from "@/lib/release-audit";
import { encryptedVaultPayloadSchema } from "@/lib/vault-schema";
import { getAuthUserFromRequest } from "@/lib/auth";

/**
 * POST /api/vault/init
 * Initialize vault backup for the first time
 */
export async function POST(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const consent = await prisma.userPrivacyConsent.findUnique({ 
    where: { userId: user.id } 
  });
  if (!consent?.backupEnabled) {
    return NextResponse.json({ error: "Backup consent required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = encryptedVaultPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid encrypted payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Check if backup already exists
  const existing = await prisma.vaultBackup.findUnique({ 
    where: { userId: user.id } 
  });
  
  if (existing) {
    return NextResponse.json({ error: "Vault already initialized" }, { status: 409 });
  }

  // Store encrypted vault in SQLite
  const metadata = await storeVaultBackup(user.id, parsed.data);
  await recordReleaseAuditEvent({ userId: user.id, type: "backup_uploaded" });

  return NextResponse.json(
    {
      id: metadata.id,
      userId: metadata.userId,
      schemaVersion: parsed.data.schemaVersion,
      createdAt: metadata.createdAt,
    },
    { status: 201 },
  );
}
