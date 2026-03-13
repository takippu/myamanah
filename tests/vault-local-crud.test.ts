import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyVaultData } from "@/lib/vault-data";
import { loadVaultData, saveVaultData } from "@/lib/vault-client";
import { setVaultSecrets } from "@/lib/vault-session";

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

describe("Local-first vault CRUD", () => {
  beforeEach(() => {
    const localStorage = createStorage();
    const sessionStorage = createStorage();
    vi.stubGlobal("window", { localStorage, sessionStorage });
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("sessionStorage", sessionStorage);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists CRUD changes locally and reflects latest data after reload", async () => {
    setVaultSecrets({
      passphrase: "correct horse battery staple",
      recoveryKey: "ak-test-recovery-key-1234567890",
    });

    const initial = emptyVaultData();
    const created = {
      ...initial,
      assets: [
        {
          id: "asset_1",
          assetType: "Bank Account",
          institution: "Maybank",
          whereToFind: "Mobile app",
          value: "12000",
        },
      ],
      debts: [
        {
          id: "debt_1",
          debtType: "Credit Card",
          creditor: "Bank Card",
          whereDocs: "Email statement",
          amount: "500",
        },
      ],
      digitalLegacy: [
        {
          id: "dl_1",
          category: "Email",
          platform: "Gmail",
          whereToFind: "Password manager",
        },
      ],
      wishes: {
        religiousWishes: "Islamic funeral",
        familyInstructions: "Family note",
        distributionNotes: "Distribution note",
        executorNotes: "Executor note",
      },
    };

    await saveVaultData(created);
    const firstRead = await loadVaultData();
    expect(firstRead?.assets).toHaveLength(1);
    expect(firstRead?.debts).toHaveLength(1);
    expect(firstRead?.digitalLegacy).toHaveLength(1);

    const updated = {
      ...firstRead!,
      assets: [
        {
          ...firstRead!.assets[0],
          institution: "CIMB",
          value: "15000",
        },
      ],
      debts: [],
    };

    await saveVaultData(updated);
    const secondRead = await loadVaultData();

    expect(secondRead?.assets[0].institution).toBe("CIMB");
    expect(secondRead?.assets[0].value).toBe("15000");
    expect(secondRead?.debts).toHaveLength(0);
    expect(secondRead?.wishes.executorNotes).toBe("Executor note");
  });
});
