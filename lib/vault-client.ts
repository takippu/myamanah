import { emptyVaultData, type VaultData } from "@/lib/vault-data";
import {
  decryptVaultData,
  encryptVaultData,
  type EncryptedVaultPayload,
} from "@/lib/vault-crypto";
import type { TrustedContactReleaseChannel } from "@prisma/client";
import { reportVaultMetrics } from "@/lib/vault-metrics";
import { getVaultSecrets } from "@/lib/vault-session";

const LOCAL_VAULT_PAYLOAD_KEY = "myamanah_local_vault_payload";
const CLOUD_BACKUP_ENABLED_KEY = "myamanah_cloud_backup_enabled";
const LOCAL_PROFILE_NAME_KEY = "myamanah_local_profile_name";

function ensureSecrets() {
  const secrets = getVaultSecrets();
  if (!secrets) {
    throw new Error("Vault access is not configured in this session.");
  }
  return secrets;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function isCloudBackupEnabled() {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(CLOUD_BACKUP_ENABLED_KEY) === "1";
}

async function isAuthenticated(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/me", { 
      credentials: "include",
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function setCloudBackupEnabled(value: boolean) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CLOUD_BACKUP_ENABLED_KEY, value ? "1" : "0");
}

function getLocalEncryptedPayload(): EncryptedVaultPayload | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(LOCAL_VAULT_PAYLOAD_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EncryptedVaultPayload;
  } catch {
    return null;
  }
}

function setLocalEncryptedPayload(payload: EncryptedVaultPayload) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_VAULT_PAYLOAD_KEY, JSON.stringify(payload));
}

export function clearLocalEncryptedPayload() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(LOCAL_VAULT_PAYLOAD_KEY);
  window.localStorage.removeItem(LOCAL_PROFILE_NAME_KEY);
}

export function getLocalProfileName(): string | null {
  if (!isBrowser()) return null;
  const name = window.localStorage.getItem(LOCAL_PROFILE_NAME_KEY);
  return name && name.trim().length > 0 ? name : null;
}

export function setLocalProfileName(name: string | null) {
  if (!isBrowser()) return;
  if (!name) {
    window.localStorage.removeItem(LOCAL_PROFILE_NAME_KEY);
    return;
  }
  window.localStorage.setItem(LOCAL_PROFILE_NAME_KEY, name);
}

function normalizeVaultData(parsed: VaultData): VaultData {
  return {
    ...emptyVaultData(),
    ...parsed,
    meta: {
      schemaVersion: parsed.meta?.schemaVersion ?? 1,
      updatedAt: parsed.meta?.updatedAt ?? new Date().toISOString(),
      deadmanLastCheckInAt: parsed.meta?.deadmanLastCheckInAt ?? null,
    },
  };
}

export function hasLocalVaultPayload(): boolean {
  return Boolean(getLocalEncryptedPayload());
}

export async function verifyLocalVaultCredentials(
  passphrase: string,
  recoveryKey: string,
): Promise<VaultData> {
  const payload = getLocalEncryptedPayload();
  if (!payload) {
    throw new Error("No local vault was found on this device.");
  }

  const plaintext = await decryptVaultData(payload, passphrase, recoveryKey);
  const parsed = JSON.parse(plaintext) as VaultData;
  return normalizeVaultData(parsed);
}

/**
 * Restore vault from cloud backup and verify credentials.
 * This is used when switching to a new device/browser.
 */
export async function restoreVaultFromCloud(
  passphrase: string,
  recoveryKey: string,
): Promise<VaultData> {
  // Check if authenticated
  if (!(await isAuthenticated())) {
    throw new Error("You must be signed in to restore from cloud backup.");
  }

  // Download encrypted backup from server
  const response = await fetch("/api/vault", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new Error("Session expired. Please sign in again.");
  }
  if (response.status === 403) {
    throw new Error("Cloud backup is not enabled for this account.");
  }
  if (response.status === 404) {
    throw new Error("No cloud backup found. Make sure you enabled backup on your other device.");
  }
  if (!response.ok) {
    throw new Error("Failed to download cloud backup.");
  }

  const payload = (await response.json()) as EncryptedVaultPayload;

  // Try to decrypt with provided credentials
  try {
    const plaintext = await decryptVaultData(payload, passphrase, recoveryKey);
    const parsed = JSON.parse(plaintext) as VaultData;
    
    // Success! Save locally for future use
    setLocalEncryptedPayload(payload);
    setCloudBackupEnabled(true);
    
    return normalizeVaultData(parsed);
  } catch {
    throw new Error("Incorrect passphrase or recovery key. Please check and try again.");
  }
}

export async function loadVaultData(): Promise<VaultData | null> {
  const secrets = ensureSecrets();
  let payload = getLocalEncryptedPayload();
  if (!payload) {
    if (!isCloudBackupEnabled()) return null;
    const response = await fetch("/api/vault", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (response.status === 404 || response.status === 403 || response.status === 401) return null;
    if (!response.ok) throw new Error("Failed to load vault");
    payload = (await response.json()) as EncryptedVaultPayload;
    setLocalEncryptedPayload(payload);
  }

  const plaintext = await decryptVaultData(payload, secrets.passphrase, secrets.recoveryKey);
  const parsed = JSON.parse(plaintext) as VaultData;
  return normalizeVaultData(parsed);
}

export async function getVaultStatus(): Promise<{
  updatedAt: string | null;
  recoveryVerifiedAt: string | null;
} | null> {
  const data = await loadVaultData();
  if (!data) return null;

  let recoveryVerifiedAt: string | null = null;
  if (isCloudBackupEnabled() && await isAuthenticated()) {
    const response = await fetch("/api/vault", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { recoveryVerifiedAt?: string | null };
      recoveryVerifiedAt = payload.recoveryVerifiedAt ?? null;
    }
  }

  return {
    updatedAt: data.meta.updatedAt ?? null,
    recoveryVerifiedAt,
  };
}

export async function saveVaultData(vaultData: VaultData): Promise<void> {
  const secrets = ensureSecrets();
  const payload = await encryptVaultData(
    JSON.stringify({
      ...vaultData,
      meta: {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        deadmanLastCheckInAt: vaultData.meta?.deadmanLastCheckInAt ?? null,
      },
    }),
    secrets.passphrase,
    secrets.recoveryKey,
  );

  setLocalEncryptedPayload(payload);

  if (isCloudBackupEnabled() && await isAuthenticated()) {
    const response = await fetch("/api/vault", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to save vault backup");
    }
  }

  await reportVaultMetrics(vaultData);
}

export async function initializeVaultIfMissing(): Promise<"created" | "exists"> {
  const secrets = ensureSecrets();
  const localPayload = getLocalEncryptedPayload();
  if (localPayload) return "exists";

  const payload = await encryptVaultData(
    JSON.stringify(emptyVaultData()),
    secrets.passphrase,
    secrets.recoveryKey,
  );

  setLocalEncryptedPayload(payload);

  if (isCloudBackupEnabled() && await isAuthenticated()) {
    const initRes = await fetch("/api/vault/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    // 409 = vault already exists
    if (!initRes.ok && initRes.status !== 409) {
      throw new Error("Failed to initialize vault backup");
    }
  }

  return "created";
}

export async function checkInDeadmanSwitch(): Promise<VaultData> {
  const current = (await loadVaultData()) ?? emptyVaultData();
  const next = {
    ...current,
    meta: {
      ...current.meta,
      deadmanLastCheckInAt: new Date().toISOString(),
    },
  };
  await saveVaultData(next);
  // Only call server if authenticated
  if (await isAuthenticated()) {
    await fetch("/api/deadman/check-in", {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
  }
  return next;
}

export async function markRecoveryVerified(): Promise<void> {
  if (!isCloudBackupEnabled()) return;
  ensureSecrets();
  const res = await fetch("/api/vault/restore/verify", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark recovery verification");
}

export async function getCloudBackupStatus(): Promise<{
  backupEnabled: boolean;
  consentedAt: string | null;
  revokedAt: string | null;
  lastSyncedAt: string | null;
}> {
  const response = await fetch("/api/privacy/consent/backup", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    return {
      backupEnabled: isCloudBackupEnabled(),
      consentedAt: null,
      revokedAt: null,
      lastSyncedAt: null,
    };
  }

  const payload = (await response.json()) as {
    backupEnabled?: boolean;
    consentedAt?: string | null;
    revokedAt?: string | null;
    lastSyncedAt?: string | null;
  };
  const enabled = Boolean(payload.backupEnabled);
  setCloudBackupEnabled(enabled);

  return {
    backupEnabled: enabled,
    consentedAt: payload.consentedAt ?? null,
    revokedAt: payload.revokedAt ?? null,
    lastSyncedAt: payload.lastSyncedAt ?? null,
  };
}

export async function enableCloudBackup(): Promise<void> {
  const response = await fetch("/api/privacy/consent/backup", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to enable cloud backup");
  setCloudBackupEnabled(true);

  const localPayload = getLocalEncryptedPayload();
  if (!localPayload) return;

  const backupRes = await fetch("/api/vault", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(localPayload),
  });
  if (!backupRes.ok) throw new Error("Failed to upload encrypted backup");
}

export async function disableCloudBackup(): Promise<void> {
  const response = await fetch("/api/privacy/consent/backup", {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to disable cloud backup");
  setCloudBackupEnabled(false);
}

export async function getTrustedContactReleaseChannels(): Promise<TrustedContactReleaseChannel[]> {
  const response = await fetch("/api/trusted-contacts/release-channels", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as { channels?: TrustedContactReleaseChannel[] };
  return payload.channels ?? [];
}

export async function saveTrustedContactReleaseChannel(args: {
  trustedContactId: string;
  releaseEmail: string;
  phoneNumber?: string | null;
}) {
  const response = await fetch("/api/trusted-contacts/release-channels", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    throw new Error("Failed to save release delivery details.");
  }
  return response.json();
}

export async function deleteTrustedContactReleaseChannel(trustedContactId: string) {
  const response = await fetch("/api/trusted-contacts/release-channels", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ trustedContactId }),
  });
  if (!response.ok) {
    throw new Error("Failed to remove release delivery details.");
  }
}

export async function getReleasePackageStatus(token: string): Promise<{
  expiresAt: string;
  firstViewedAt: string | null;
  downloadedAt: string | null;
  acceptedAt: string | null;
  requiresRecoveryKey: boolean;
  message: string;
}> {
  const response = await fetch(`/api/release/${encodeURIComponent(token)}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(response.status === 410 ? "This secure retrieval link has expired." : "Unable to open secure retrieval link.");
  }
  return response.json();
}

export async function acceptReleasePackage(token: string): Promise<void> {
  const response = await fetch(`/api/release/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "accept" }),
  });
  if (!response.ok) {
    throw new Error("Failed to accept release instructions.");
  }
}

export async function downloadReleasePackage(token: string): Promise<EncryptedVaultPayload> {
  const response = await fetch(`/api/release/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "download" }),
  });
  if (!response.ok) {
    throw new Error(response.status === 410 ? "This secure retrieval link has expired." : "Failed to download encrypted backup.");
  }
  const payload = (await response.json()) as { encryptedPayload: EncryptedVaultPayload };
  return payload.encryptedPayload;
}
