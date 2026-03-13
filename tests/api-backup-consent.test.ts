import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthUserFromRequest = vi.fn();
const mockConsentFindUnique = vi.fn();
const mockConsentUpsert = vi.fn();
const mockVaultFindUnique = vi.fn();
const mockVaultUpsert = vi.fn();
const mockVaultDeleteMany = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthUserFromRequest: mockGetAuthUserFromRequest,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userPrivacyConsent: {
      findUnique: mockConsentFindUnique,
      upsert: mockConsentUpsert,
    },
    vault: {
      findUnique: mockVaultFindUnique,
      upsert: mockVaultUpsert,
      deleteMany: mockVaultDeleteMany,
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

describe("Backup consent gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserFromRequest.mockResolvedValue({ id: "user_123" });
  });

  it("blocks vault reads when backup consent is disabled", async () => {
    mockConsentFindUnique.mockResolvedValue({ backupEnabled: false });
    const { GET } = await import("@/app/api/vault/route");

    const res = await GET();
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(403);
    expect(body.error).toBe("Backup consent required");
    expect(mockVaultFindUnique).not.toHaveBeenCalled();
  });

  it("allows encrypted backup writes only when consent is enabled", async () => {
    mockConsentFindUnique.mockResolvedValue({ backupEnabled: true });
    mockVaultUpsert.mockResolvedValue({
      userId: "user_123",
      schemaVersion: 1,
      updatedAt: new Date("2026-02-24T00:00:00.000Z"),
    });
    const { PUT } = await import("@/app/api/vault/route");

    const req = new Request("http://localhost/api/vault", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validEncryptedPayload),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    expect(mockVaultUpsert).toHaveBeenCalledTimes(1);
    expect(mockVaultUpsert).toHaveBeenCalledWith({
      where: { userId: "user_123" },
      update: validEncryptedPayload,
      create: { userId: "user_123", ...validEncryptedPayload },
    });
  });

  it("revoking backup consent deletes cloud backup data", async () => {
    mockConsentUpsert.mockResolvedValue({
      backupEnabled: false,
      revokedAt: new Date("2026-02-24T00:00:00.000Z"),
    });
    const { DELETE } = await import("@/app/api/privacy/consent/backup/route");

    const res = await DELETE();
    const body = (await res.json()) as { backupEnabled?: boolean };

    expect(res.status).toBe(200);
    expect(body.backupEnabled).toBe(false);
    expect(mockVaultDeleteMany).toHaveBeenCalledWith({ where: { userId: "user_123" } });
  });
});
