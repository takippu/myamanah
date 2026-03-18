export type VaultContact = {
  name: string;
  method: string;
};

// Transaction types for tracking payments and adjustments
export type DebtTransaction = {
  id: string;
  date: string;
  amount: number;
  type: 'payment' | 'increase';
  notes?: string;
  balanceAfter: number;
  createdAt: string;
};

export type AssetTransaction = {
  id: string;
  date: string;
  amount: number;
  type: 'appreciation' | 'depreciation' | 'adjustment';
  notes?: string;
  valueAfter: number;
  createdAt: string;
};

export type DebtorTransaction = {
  id: string;
  date: string;
  amount: number;
  type: 'payment' | 'additional_loan';
  notes?: string;
  balanceAfter: number;
  createdAt: string;
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
  valueNumber?: number;
  transactions?: AssetTransaction[];
  createdAt?: string;
  updatedAt?: string;
};

export type DebtRecord = {
  id: string;
  debtType: string;
  creditor: string;
  amount?: string;
  amountNumber?: number;
  remainingAmount?: number;
  dueDate?: string;
  whereDocs: string;
  contacts?: VaultContact[];
  notes?: string;
  transactions?: DebtTransaction[];
  createdAt?: string;
  updatedAt?: string;
};

// New: Debtor type for tracking money owed TO the user
export type Debtor = {
  id: string;
  name: string;
  originalAmount: number;
  remainingAmount: number;
  dateLent: string;
  dueDate?: string;
  contact?: string;
  notes?: string;
  status: 'pending' | 'paid';
  transactions: DebtorTransaction[];
  createdAt: string;
  updatedAt: string;
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
  debtors?: Debtor[];
  digitalLegacy: DigitalLegacyRecord[];
  wishes: WishesRecord;
  checklist: ChecklistState;
  trustedContacts: Array<{ id: string; name: string; relation?: string; contact?: string }>;
  meta: {
    schemaVersion: number;
    updatedAt: string;
    deadmanLastCheckInAt?: string | null;
    profileName?: string;
  };
};

export function emptyVaultData(): VaultData {
  return {
    assets: [],
    debts: [],
    debtors: [],
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
