import { DeadmanReleaseStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReleaseTokenFindMany = vi.fn();
const mockTrustedContactFindUnique = vi.fn();
const mockTrustedContactUpdate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockDeadmanStateUpdate = vi.fn();
const mockDeadmanStateFindUnique = vi.fn();
const mockReleaseTokenCreate = vi.fn();
const mockReleaseAuditCreate = vi.fn();

const mockSendResendEmail = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    releaseRetrievalToken: {
      findMany: mockReleaseTokenFindMany,
      create: mockReleaseTokenCreate,
    },
    trustedContactReleaseChannel: {
      findUnique: mockTrustedContactFindUnique,
      update: mockTrustedContactUpdate,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
    deadmanReleaseState: {
      update: mockDeadmanStateUpdate,
      findUnique: mockDeadmanStateFindUnique,
      upsert: vi.fn(),
    },
    releaseAuditEvent: {
      create: mockReleaseAuditCreate,
    },
  },
}));

vi.mock("@/lib/release-mailer", () => ({
  sendResendEmail: mockSendResendEmail,
}));

describe("Deadman release flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReleaseTokenFindMany.mockResolvedValue([]);
    mockTrustedContactFindUnique.mockResolvedValue(null);
    mockReleaseAuditCreate.mockResolvedValue({});
    mockSendResendEmail.mockResolvedValue({ id: "email_123" });
  });

  it("starts grace period and sends the owner warning email", async () => {
    const now = new Date("2026-03-14T00:00:00.000Z");
    const lastCheckInAt = new Date("2026-02-12T00:00:00.000Z");
    const graceEndsAt = new Date("2026-03-17T00:00:00.000Z");

    mockUserFindUnique
      .mockResolvedValueOnce({
        id: "user_123",
        email: "owner@example.com",
        deadmanReleaseState: {
          userId: "user_123",
          status: DeadmanReleaseStatus.armed,
          lastCheckInAt,
          missedAt: null,
          graceEndsAt: null,
          ownerWarningSentAt: null,
        },
        trustedContactReleaseChannels: [],
        vaultBackup: null,
      })
      .mockResolvedValueOnce({
        id: "user_123",
        email: "owner@example.com",
        deadmanReleaseState: {
          userId: "user_123",
          status: DeadmanReleaseStatus.grace_period,
          lastCheckInAt,
          missedAt: new Date("2026-03-14T00:00:00.000Z"),
          graceEndsAt,
          ownerWarningSentAt: null,
        },
        trustedContactReleaseChannels: [],
        vaultBackup: null,
      });
    mockDeadmanStateFindUnique.mockResolvedValue({
      userId: "user_123",
      status: DeadmanReleaseStatus.grace_period,
      graceEndsAt,
    });

    const { processDeadmanRelease } = await import("@/lib/deadman-release");
    await processDeadmanRelease("user_123", now);

    expect(mockDeadmanStateUpdate).toHaveBeenNthCalledWith(1, {
      where: { userId: "user_123" },
      data: {
        status: DeadmanReleaseStatus.grace_period,
        missedAt: new Date("2026-03-14T00:00:00.000Z"),
        graceEndsAt,
      },
    });
    expect(mockSendResendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendResendEmail.mock.calls[0]?.[0]).toMatchObject({
      to: "owner@example.com",
      subject: expect.stringContaining("grace period"),
    });
    expect(mockReleaseAuditCreate).toHaveBeenCalled();
  });

  it("releases after grace expiry, creates retrieval token, and emails trusted contact", async () => {
    const now = new Date("2026-03-20T00:00:00.000Z");

    mockUserFindUnique.mockResolvedValue({
      id: "user_123",
      email: "owner@example.com",
      deadmanReleaseState: {
        userId: "user_123",
        status: DeadmanReleaseStatus.grace_period,
        lastCheckInAt: new Date("2026-02-10T00:00:00.000Z"),
        missedAt: new Date("2026-03-12T00:00:00.000Z"),
        graceEndsAt: new Date("2026-03-15T00:00:00.000Z"),
        ownerWarningSentAt: new Date("2026-03-12T02:00:00.000Z"),
      },
      trustedContactReleaseChannels: [
        {
          userId: "user_123",
          trustedContactId: "contact_1",
          releaseEmail: "contact@example.com",
          phoneNumber: "+15555550123",
          emailIgnored: false,
          firstViewedAt: null,
          downloadedAt: null,
          acceptedAt: null,
        },
      ],
      vaultBackup: {
        userId: "user_123",
        ciphertext: "encrypted_vault_data",
      },
    });
    mockReleaseTokenCreate.mockResolvedValue({});
    mockDeadmanStateFindUnique.mockResolvedValue({
      userId: "user_123",
      status: DeadmanReleaseStatus.released,
      releasedAt: now,
    });

    const { processDeadmanRelease } = await import("@/lib/deadman-release");
    await processDeadmanRelease("user_123", now);

    expect(mockDeadmanStateUpdate).toHaveBeenCalledWith({
      where: { userId: "user_123" },
      data: {
        status: DeadmanReleaseStatus.released,
        releasedAt: now,
      },
    });
    expect(mockReleaseTokenCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_123",
        trustedContactId: "contact_1",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
    expect(mockSendResendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "contact@example.com",
        subject: expect.stringContaining("secure retrieval"),
      }),
    );
  });
});
