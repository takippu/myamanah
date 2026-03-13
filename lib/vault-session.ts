export type VaultSecrets = {
  passphrase: string;
  recoveryKey: string;
};

let inMemoryVaultSecrets: VaultSecrets | null = null;

export function getVaultSecrets(): VaultSecrets | null {
  return inMemoryVaultSecrets;
}

export function setVaultSecrets(secrets: VaultSecrets) {
  inMemoryVaultSecrets = { ...secrets };
}

export function clearVaultSecrets() {
  inMemoryVaultSecrets = null;
}
