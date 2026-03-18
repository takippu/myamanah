import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthUserFromRequest = vi.fn();
const mockConsentFindUnique = vi.fn();
const mockVaultBackupFindUnique = vi.fn();
const mockVaultBackupUpdate = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthUserFromRequest: mockGetAuthUserFromRequest,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userPrivacyConsent: {
      findUnique: mockConsentFindUnique,
    },
    vaultBackup: {
      findUnique: mockVaultBackupFindUnique,
      update: mockVaultBackupUpdate,
    },
  },
}));

const validEncryptedPayload = {
  ciphertext: "ciphertext",
  iv: "iv",
  authTag: "authTag",
  wrappedDekPass: "wrappedPass",
  wrappedDekRecovery: "wrappedRecovery",
  saltPass: "saltPass",
  saltRecovery: "saltRecovery",
  kdfParams: {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  },
  schemaVersion: 1,
};

describe("Vault restore and encrypted download routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserFromRequest.mockResolvedValue({ id: "user_123" });
    mockConsentFindUnique.mockResolvedValue({ backupEnabled: true });
  });

  it("downloads the encrypted backup payload without exposing plaintext", async () => {
    mockVaultBackupFindUnique.mockResolvedValue({
      userId: "user_123",
      ciphertext: "ciphertext",
      iv: "iv",
      authTag: "authTag",
      wrappedDekPass: "wrappedPass",
      wrappedDekRecovery: "wrappedRecovery",
      saltPass: "saltPass",
      saltRecovery: "saltRecovery",
      kdfParams: validEncryptedPayload.kdfParams,
      schemaVersion: 1,
      recoveryVerifiedAt: new Date("2026-03-13T00:00:00.000Z"),
      lastBackedUpAt: new Date("2026-03-13T12:00:00.000Z"),
    });

    const { GET } = await import("@/app/api/vault/route");
    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.ciphertext).toBe("ciphertext");
    expect(body.schemaVersion).toBe(1);
    expect(body.recoveryVerifiedAt).toBeTruthy();
    expect(mockVaultBackupFindUnique).toHaveBeenCalledWith({ where: { userId: "user_123" } });
  });

  it("marks restore verification only after consented encrypted backup exists", async () => {
    mockVaultBackupFindUnique.mockResolvedValue({
      userId: "user_123",
      ciphertext: "ciphertext",
    });
    mockVaultBackupUpdate.mockResolvedValue({
      userId: "user_123",
      recoveryVerifiedAt: new Date("2026-03-14T08:00:00.000Z"),
    });

    const { POST } = await import("@/app/api/vault/restore/verify/route");
    const res = await POST();
    const body = (await res.json()) as { userId?: string; recoveryVerifiedAt?: string };

    expect(res.status).toBe(200);
    expect(body.userId).toBe("user_123");
    expect(body.recoveryVerifiedAt).toBeTruthy();
    expect(mockVaultBackupUpdate).toHaveBeenCalledWith({
      where: { userId: "user_123" },
      data: {
        recoveryVerifiedAt: expect.any(Date),
      },
    });
  });
});
