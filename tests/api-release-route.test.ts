import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReleaseTokenFindUnique = vi.fn();
const mockTrustedContactFindUnique = vi.fn();
const mockTrustedContactUpdate = vi.fn();
const mockVaultBackupFindUnique = vi.fn();
const mockReleaseTokenUpdate = vi.fn();
const mockRecordReleaseAuditEvent = vi.fn();
const mockGetVaultBackup = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    releaseRetrievalToken: {
      findUnique: mockReleaseTokenFindUnique,
      update: mockReleaseTokenUpdate,
    },
    trustedContactReleaseChannel: {
      findUnique: mockTrustedContactFindUnique,
      update: mockTrustedContactUpdate,
    },
    vaultBackup: {
      findUnique: mockVaultBackupFindUnique,
    },
  },
}));

vi.mock("@/lib/sqlite-backup", () => ({
  getVaultBackup: mockGetVaultBackup,
}));

vi.mock("@/lib/release-audit", () => ({
  recordReleaseAuditEvent: mockRecordReleaseAuditEvent,
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

describe("Secure retrieval route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordReleaseAuditEvent.mockResolvedValue(undefined);
  });

  it("marks the first view and returns secure retrieval instructions", async () => {
    const expiresAt = new Date("2026-03-20T00:00:00.000Z");
    mockReleaseTokenFindUnique.mockResolvedValue({
      userId: "user_123",
      trustedContactId: "contact_1",
      tokenHash: "hashed",
      expiresAt,
    });
    mockTrustedContactUpdate.mockResolvedValue({
      firstViewedAt: new Date("2026-03-14T09:00:00.000Z"),
      downloadedAt: null,
      acceptedAt: null,
    });

    const { GET } = await import("@/app/api/release/[token]/route");
    const res = await GET(new Request("http://localhost/api/release/token_123"), {
      params: Promise.resolve({ token: "token_123" }),
    });
    const body = (await res.json()) as { message?: string; firstViewedAt?: string };

    expect(res.status).toBe(200);
    expect(body.message).toContain("recovery key");
    expect(body.firstViewedAt).toBeTruthy();
    expect(mockRecordReleaseAuditEvent).toHaveBeenCalledWith({
      userId: "user_123",
      trustedContactId: "contact_1",
      type: "retrieval_viewed",
    });
  });

  it("downloads the encrypted backup and records retrieval usage", async () => {
    const expiresAt = new Date("2026-03-20T00:00:00.000Z");
    mockReleaseTokenFindUnique.mockResolvedValue({
      userId: "user_123",
      trustedContactId: "contact_1",
      tokenHash: "hashed",
      expiresAt,
    });
    mockGetVaultBackup.mockResolvedValue({
      payload: validEncryptedPayload,
      metadata: {
        id: "backup_123",
        userId: "user_123",
        lastBackedUpAt: new Date("2026-03-13T12:00:00.000Z"),
        backupFingerprint: "fingerprint_abc",
        recoveryVerifiedAt: null,
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-13T12:00:00.000Z"),
      },
    });
    mockTrustedContactUpdate.mockResolvedValue({
      downloadedAt: new Date("2026-03-14T10:00:00.000Z"),
    });
    mockReleaseTokenUpdate.mockResolvedValue({});

    const { POST } = await import("@/app/api/release/[token]/route");
    const res = await POST(
      new Request("http://localhost/api/release/token_123", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "download" }),
      }),
      {
        params: Promise.resolve({ token: "token_123" }),
      },
    );
    const body = (await res.json()) as { fileName?: string; encryptedPayload?: { ciphertext?: string } };

    expect(res.status).toBe(200);
    expect(body.fileName).toBe("myamanah-vault-backup.json");
    expect(body.encryptedPayload?.ciphertext).toBe("ciphertext");
    expect(mockReleaseTokenUpdate).toHaveBeenCalledWith({
      where: { tokenHash: "hashed" },
      data: { usedAt: expect.any(Date) },
    });
    expect(mockRecordReleaseAuditEvent).toHaveBeenCalledWith({
      userId: "user_123",
      trustedContactId: "contact_1",
      type: "retrieval_downloaded",
    });
  });
});
