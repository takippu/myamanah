import { emptyVaultData, type VaultData } from "@/lib/vault-data";
import {
  decryptVaultData,
  encryptVaultData,
  type EncryptedVaultPayload,
} from "@/lib/vault-crypto";
import { getVaultSecrets } from "@/lib/vault-session";

function ensureSecrets() {
  const secrets = getVaultSecrets();
  if (!secrets) {
    throw new Error("Vault access is not configured in this session.");
  }
  return secrets;
}

export async function loadVaultData(): Promise<VaultData | null> {
  const secrets = ensureSecrets();
  const response = await fetch("/api/vault", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to load vault");

  const payload = (await response.json()) as EncryptedVaultPayload;
  const plaintext = await decryptVaultData(payload, secrets.passphrase, secrets.recoveryKey);
  const parsed = JSON.parse(plaintext) as VaultData;

  return {
    ...emptyVaultData(),
    ...parsed,
    meta: {
      schemaVersion: parsed.meta?.schemaVersion ?? 1,
      updatedAt: parsed.meta?.updatedAt ?? new Date().toISOString(),
    },
  };
}

export async function getVaultStatus(): Promise<{
  updatedAt: string | null;
  recoveryVerifiedAt: string | null;
} | null> {
  ensureSecrets();
  const response = await fetch("/api/vault", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to load vault status");
  const payload = (await response.json()) as {
    updatedAt?: string;
    recoveryVerifiedAt?: string | null;
  };
  return {
    updatedAt: payload.updatedAt ?? null,
    recoveryVerifiedAt: payload.recoveryVerifiedAt ?? null,
  };
}

export async function saveVaultData(vaultData: VaultData): Promise<void> {
  const secrets = ensureSecrets();
  const payload = await encryptVaultData(
    JSON.stringify({
      ...vaultData,
      meta: { schemaVersion: 1, updatedAt: new Date().toISOString() },
    }),
    secrets.passphrase,
    secrets.recoveryKey,
  );

  const response = await fetch("/api/vault", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to save vault");
  }
}

export async function initializeVaultIfMissing(): Promise<"created" | "exists"> {
  const secrets = ensureSecrets();
  const response = await fetch("/api/vault", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (response.ok) return "exists";
  if (response.status !== 404) throw new Error("Failed to check vault");

  const payload = await encryptVaultData(
    JSON.stringify(emptyVaultData()),
    secrets.passphrase,
    secrets.recoveryKey,
  );
  const initRes = await fetch("/api/vault/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!initRes.ok && initRes.status !== 409) {
    throw new Error("Failed to initialize vault");
  }
  return "created";
}

export async function markRecoveryVerified(): Promise<void> {
  ensureSecrets();
  const res = await fetch("/api/vault/restore/verify", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark recovery verification");
}
