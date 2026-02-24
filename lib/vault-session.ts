const PASSPHRASE = "myamanah_passphrase";
const RECOVERY_KEY = "myamanah_recovery_key";

export type VaultSecrets = {
  passphrase: string;
  recoveryKey: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function getVaultSecrets(): VaultSecrets | null {
  if (!isBrowser()) return null;
  const passphrase = sessionStorage.getItem(PASSPHRASE) ?? "";
  const recoveryKey = sessionStorage.getItem(RECOVERY_KEY) ?? "";
  if (!passphrase || !recoveryKey) return null;
  return { passphrase, recoveryKey };
}

export function setVaultSecrets(secrets: VaultSecrets) {
  if (!isBrowser()) return;
  sessionStorage.setItem(PASSPHRASE, secrets.passphrase);
  sessionStorage.setItem(RECOVERY_KEY, secrets.recoveryKey);
}

export function clearVaultSecrets() {
  if (!isBrowser()) return;
  sessionStorage.removeItem(PASSPHRASE);
  sessionStorage.removeItem(RECOVERY_KEY);
}
