export type VaultContact = {
  name: string;
  method: string;
};

export type AssetRecord = {
  id: string;
  assetType: string;
  institution: string;
  whereToFind: string;
  contacts?: VaultContact[];
  contactPerson?: string;
  contactMethod?: string;
  notes?: string;
  value?: string;
};

export type DebtRecord = {
  id: string;
  debtType: string;
  creditor: string;
  amount?: string;
  dueDate?: string;
  whereDocs: string;
  contacts?: VaultContact[];
  notes?: string;
};

export type WishesRecord = {
  religiousWishes: string;
  familyInstructions: string;
  distributionNotes: string;
  executorNotes: string;
};

export type DigitalLegacyRecord = {
  id: string;
  category: string;
  platform: string;
  whereToFind: string;
  accountIdentifier?: string;
  accountPassword?: string;
  contacts?: VaultContact[];
  recoveryContact?: string;
  notes?: string;
};

export type ChecklistState = {
  recoveryKeySaved?: boolean;
  recoveryTested?: boolean;
};

export type VaultData = {
  assets: AssetRecord[];
  debts: DebtRecord[];
  digitalLegacy: DigitalLegacyRecord[];
  wishes: WishesRecord;
  checklist: ChecklistState;
  trustedContacts: Array<{ id: string; name: string; relation?: string; contact?: string }>;
  meta: {
    schemaVersion: number;
    updatedAt: string;
    deadmanLastCheckInAt?: string | null;
  };
};

export function emptyVaultData(): VaultData {
  return {
    assets: [],
    debts: [],
    digitalLegacy: [],
    wishes: {
      religiousWishes: "",
      familyInstructions: "",
      distributionNotes: "",
      executorNotes: "",
    },
    checklist: {},
    trustedContacts: [],
    meta: {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      deadmanLastCheckInAt: null,
    },
  };
}
