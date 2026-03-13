import { describe, expect, it, vi } from "vitest";
import { reportVaultMetrics } from "@/lib/vault-metrics";
import {
  CHECKLIST_PROGRESS_FIELDS,
  READINESS_FIELDS,
  SENSITIVE_VAULT_SECTIONS,
} from "@/lib/privacy-boundary";
import type { VaultData } from "@/lib/vault-data";

describe("Vault metrics reporting", () => {
  it("sends only derived non-confidential readiness and checklist payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const vaultData: VaultData = {
      assets: [
        {
          id: "a1",
          assetType: "Bank Account",
          institution: "Sensitive Bank",
          whereToFind: "Private folder",
          value: "1000000",
        },
      ],
      debts: [
        {
          id: "d1",
          debtType: "Credit Card",
          creditor: "Sensitive Creditor",
          whereDocs: "Private docs",
          amount: "500",
        },
      ],
      digitalLegacy: [
        {
          id: "g1",
          category: "Email",
          platform: "Gmail",
          whereToFind: "Password manager",
        },
      ],
      wishes: {
        religiousWishes: "Religious details",
        familyInstructions: "Family details",
        distributionNotes: "Distribution details",
        executorNotes: "Executor details",
      },
      checklist: {
        recoveryKeySaved: true,
        recoveryTested: false,
      },
      trustedContacts: [{ id: "t1", name: "Trusted Person", relation: "Sibling", contact: "01234567" }],
      meta: { schemaVersion: 1, updatedAt: new Date().toISOString() },
    };

    await reportVaultMetrics(vaultData);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const checklistBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const readinessBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));

    expect(checklistBody).toEqual({
      assetsMapped: true,
      debtsRecorded: true,
      digitalLegacyAdded: true,
      wishesCompleted: true,
      trustedContactAdded: true,
      recoveryKeySaved: true,
      recoveryTested: false,
    });
    expect(readinessBody).toEqual({
      readinessPercent: 86,
      completedCount: 6,
      totalCount: 7,
    });
    expect(Object.keys(checklistBody).sort()).toEqual([...CHECKLIST_PROGRESS_FIELDS].sort());
    expect(Object.keys(readinessBody).sort()).toEqual([...READINESS_FIELDS].sort());

    for (const field of SENSITIVE_VAULT_SECTIONS) {
      expect(checklistBody).not.toHaveProperty(field);
      expect(readinessBody).not.toHaveProperty(field);
    }
  });
});
