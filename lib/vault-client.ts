import { emptyVaultData, type VaultData } from "@/lib/vault-data";
import {
  decryptVaultData,
  encryptVaultData,
  type EncryptedVaultPayload,
} from "@/lib/vault-crypto";
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

function setCloudBackupEnabled(value: boolean) {
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
  if (isCloudBackupEnabled()) {
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

  if (isCloudBackupEnabled()) {
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

  if (isCloudBackupEnabled()) {
    const initRes = await fetch("/api/vault/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
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
    };
  }

  const payload = (await response.json()) as {
    backupEnabled?: boolean;
    consentedAt?: string | null;
    revokedAt?: string | null;
  };
  const enabled = Boolean(payload.backupEnabled);
  setCloudBackupEnabled(enabled);

  return {
    backupEnabled: enabled,
    consentedAt: payload.consentedAt ?? null,
    revokedAt: payload.revokedAt ?? null,
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
