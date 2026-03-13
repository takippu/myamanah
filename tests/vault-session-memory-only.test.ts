import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearVaultSecrets, getVaultSecrets, setVaultSecrets } from "@/lib/vault-session";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("Vault session secrets", () => {
  beforeEach(() => {
    const localStorage = createStorage();
    const sessionStorage = createStorage();
    vi.stubGlobal("window", { localStorage, sessionStorage });
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("sessionStorage", sessionStorage);
    clearVaultSecrets();
  });

  afterEach(() => {
    clearVaultSecrets();
    vi.unstubAllGlobals();
  });

  it("keeps unlock secrets in memory instead of session storage", () => {
    setVaultSecrets({
      passphrase: "correct horse battery staple",
      recoveryKey: "ak-test-recovery-key-1234567890",
    });

    expect(getVaultSecrets()).toEqual({
      passphrase: "correct horse battery staple",
      recoveryKey: "ak-test-recovery-key-1234567890",
    });

    expect(sessionStorage.getItem("myamanah_passphrase")).toBeNull();
    expect(sessionStorage.getItem("myamanah_recovery_key")).toBeNull();
  });
});
