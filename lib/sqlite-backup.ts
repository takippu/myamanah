import { prisma } from "@/lib/prisma";
import { sha256Hex } from "./release-utils";

export type EncryptedVaultPayload = {
  ciphertext: string;      // Base64 encrypted vault data
  iv: string;              // Initialization vector (base64)
  authTag: string;         // Authentication tag (base64)
  wrappedDekPass: string;  // DEK wrapped with passphrase
  wrappedDekRecovery: string; // DEK wrapped with recovery key
  saltPass: string;        // Salt for passphrase KDF
  saltRecovery: string;    // Salt for recovery key KDF
  kdfParams: {
    memoryCost: number;
    timeCost: number;
    parallelism: number;
  };
  schemaVersion: number;
};

export type BackupMetadata = {
  id: string;
  userId: string;
  lastBackedUpAt: Date;
  backupFingerprint: string;
  recoveryVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Store encrypted vault backup in SQLite
 * The vault data is already encrypted client-side before being sent here
 */
export async function storeVaultBackup(
  userId: string,
  payload: EncryptedVaultPayload
): Promise<BackupMetadata> {
  // Generate fingerprint for integrity checking
  const fingerprint = sha256Hex(payload.ciphertext);

  const backup = await prisma.vaultBackup.upsert({
    where: { userId },
    create: {
      userId,
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      authTag: payload.authTag,
      wrappedDekPass: payload.wrappedDekPass,
      wrappedDekRecovery: payload.wrappedDekRecovery,
      saltPass: payload.saltPass,
      saltRecovery: payload.saltRecovery,
      kdfParams: payload.kdfParams,
      schemaVersion: payload.schemaVersion,
      backupFingerprint: fingerprint,
      lastBackedUpAt: new Date(),
    },
    update: {
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      authTag: payload.authTag,
      wrappedDekPass: payload.wrappedDekPass,
      wrappedDekRecovery: payload.wrappedDekRecovery,
      saltPass: payload.saltPass,
      saltRecovery: payload.saltRecovery,
      kdfParams: payload.kdfParams,
      schemaVersion: payload.schemaVersion,
      backupFingerprint: fingerprint,
      lastBackedUpAt: new Date(),
    },
  });

  return {
    id: backup.id,
    userId: backup.userId,
    lastBackedUpAt: backup.lastBackedUpAt,
    backupFingerprint: backup.backupFingerprint,
    recoveryVerifiedAt: backup.recoveryVerifiedAt,
    createdAt: backup.createdAt,
    updatedAt: backup.updatedAt,
  };
}

/**
 * Retrieve encrypted vault backup from SQLite
 * Returns null if no backup exists
 */
export async function getVaultBackup(userId: string): Promise<{
  payload: EncryptedVaultPayload;
  metadata: BackupMetadata;
} | null> {
  const backup = await prisma.vaultBackup.findUnique({
    where: { userId },
  });

  if (!backup) {
    return null;
  }

  const payload: EncryptedVaultPayload = {
    ciphertext: backup.ciphertext,
    iv: backup.iv,
    authTag: backup.authTag,
    wrappedDekPass: backup.wrappedDekPass,
    wrappedDekRecovery: backup.wrappedDekRecovery,
    saltPass: backup.saltPass,
    saltRecovery: backup.saltRecovery,
    kdfParams: backup.kdfParams as EncryptedVaultPayload["kdfParams"],
    schemaVersion: backup.schemaVersion,
  };

  const metadata: BackupMetadata = {
    id: backup.id,
    userId: backup.userId,
    lastBackedUpAt: backup.lastBackedUpAt,
    backupFingerprint: backup.backupFingerprint,
    recoveryVerifiedAt: backup.recoveryVerifiedAt,
    createdAt: backup.createdAt,
    updatedAt: backup.updatedAt,
  };

  return { payload, metadata };
}

/**
 * Delete vault backup from SQLite
 */
export async function deleteVaultBackup(userId: string): Promise<void> {
  await prisma.vaultBackup.deleteMany({
    where: { userId },
  });
}

/**
 * Check if user has a backup stored
 */
export async function hasVaultBackup(userId: string): Promise<boolean> {
  const count = await prisma.vaultBackup.count({
    where: { userId },
  });
  return count > 0;
}

/**
 * Get backup metadata without the encrypted payload
 * Useful for checking backup status without loading full data
 */
export async function getBackupMetadata(userId: string): Promise<BackupMetadata | null> {
  const backup = await prisma.vaultBackup.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      lastBackedUpAt: true,
      backupFingerprint: true,
      recoveryVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!backup) {
    return null;
  }

  return backup;
}

/**
 * Verify backup integrity by comparing fingerprint
 */
export async function verifyBackupIntegrity(
  userId: string,
  expectedFingerprint: string
): Promise<boolean> {
  const backup = await prisma.vaultBackup.findUnique({
    where: { userId },
    select: { backupFingerprint: true },
  });

  if (!backup) {
    return false;
  }

  return backup.backupFingerprint === expectedFingerprint;
}
