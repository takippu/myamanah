import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";

/**
 * POST /api/vault/restore/verify
 * Mark vault backup as successfully restored (recovery verified)
 */
export async function POST() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const consent = await prisma.userPrivacyConsent.findUnique({ 
    where: { userId: user.id } 
  });
  if (!consent?.backupEnabled) {
    return NextResponse.json({ error: "Backup consent required" }, { status: 403 });
  }

  const backup = await prisma.vaultBackup.findUnique({ 
    where: { userId: user.id } 
  });
  
  if (!backup) {
    return NextResponse.json({ error: "Vault not found" }, { status: 404 });
  }

  const updated = await prisma.vaultBackup.update({
    where: { userId: user.id },
    data: {
      recoveryVerifiedAt: new Date(),
    },
  });

  return NextResponse.json({
    userId: updated.userId,
    recoveryVerifiedAt: updated.recoveryVerifiedAt,
  });
}
