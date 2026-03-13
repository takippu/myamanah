import type { VaultData } from "@/lib/vault-data";

type ChecklistProgressPayload = {
  assetsMapped: boolean;
  debtsRecorded: boolean;
  digitalLegacyAdded: boolean;
  wishesCompleted: boolean;
  trustedContactAdded: boolean;
  recoveryKeySaved: boolean;
  recoveryTested: boolean;
};

function buildChecklistProgress(vaultData: VaultData): ChecklistProgressPayload {
  return {
    assetsMapped: (vaultData.assets?.length ?? 0) > 0,
    debtsRecorded: (vaultData.debts?.length ?? 0) > 0,
    digitalLegacyAdded: (vaultData.digitalLegacy?.length ?? 0) > 0,
    wishesCompleted:
      Boolean(vaultData.wishes?.religiousWishes?.trim()) &&
      Boolean(vaultData.wishes?.familyInstructions?.trim()) &&
      Boolean(vaultData.wishes?.executorNotes?.trim()),
    trustedContactAdded: (vaultData.trustedContacts?.length ?? 0) > 0,
    recoveryKeySaved: Boolean(vaultData.checklist?.recoveryKeySaved),
    recoveryTested: Boolean(vaultData.checklist?.recoveryTested),
  };
}

function buildReadiness(checklist: ChecklistProgressPayload) {
  const values = Object.values(checklist);
  const completedCount = values.filter(Boolean).length;
  const totalCount = values.length;
  const readinessPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return { readinessPercent, completedCount, totalCount };
}

export async function reportVaultMetrics(vaultData: VaultData) {
  const checklist = buildChecklistProgress(vaultData);
  const readiness = buildReadiness(checklist);

  await Promise.allSettled([
    fetch("/api/metrics/checklist-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(checklist),
    }),
    fetch("/api/metrics/readiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(readiness),
    }),
  ]);
}
