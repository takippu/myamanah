import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";

/**
 * GET /api/vault/status
 * Check if user has a cloud backup
 * Returns: { hasBackup: boolean, backupEnabled: boolean }
 */
export async function GET() {
  const user = await getAuthUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has backup consent enabled
  const consent = await prisma.userPrivacyConsent.findUnique({
    where: { userId: user.id },
  });
  const backupEnabled = Boolean(consent?.backupEnabled);

  // Check if user has an actual vault backup
  const backup = await prisma.vaultBackup.findUnique({
    where: { userId: user.id },
  });
  const hasBackup = Boolean(backup);

  return NextResponse.json({
    hasBackup,
    backupEnabled,
    lastBackedUpAt: backup?.lastBackedUpAt?.toISOString() || null,
  });
}
