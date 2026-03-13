import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthUserFromRequest = vi.fn();
const mockReadinessCreate = vi.fn();
const mockChecklistUpsert = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthUserFromRequest: mockGetAuthUserFromRequest,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userReadinessSnapshot: {
      create: mockReadinessCreate,
    },
    userChecklistProgress: {
      upsert: mockChecklistUpsert,
    },
  },
}));

describe("Metrics privacy enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserFromRequest.mockResolvedValue({ id: "user_123" });
  });

  it("rejects readiness payloads with confidential extra fields", async () => {
    const { POST } = await import("@/app/api/metrics/readiness/route");

    const req = new Request("http://localhost/api/metrics/readiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readinessPercent: 67,
        completedCount: 4,
        totalCount: 6,
        assets: [{ institution: "Bank", value: "1000000" }],
      }),
    });

    const res = await POST(req);
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid readiness payload");
    expect(mockReadinessCreate).not.toHaveBeenCalled();
  });

  it("rejects checklist payloads with confidential extra fields", async () => {
    const { POST } = await import("@/app/api/metrics/checklist-progress/route");

    const req = new Request("http://localhost/api/metrics/checklist-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetsMapped: true,
        debtsRecorded: true,
        digitalLegacyAdded: true,
        wishesCompleted: true,
        trustedContactAdded: true,
        recoveryKeySaved: true,
        recoveryTested: false,
        debts: [{ creditor: "Card Company", amount: "2000" }],
      }),
    });

    const res = await POST(req);
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid checklist payload");
    expect(mockChecklistUpsert).not.toHaveBeenCalled();
  });

  it("accepts valid readiness payload and persists only allowed metrics", async () => {
    mockReadinessCreate.mockResolvedValue({
      id: "snapshot_1",
      readinessPercent: 83,
      completedCount: 5,
      totalCount: 6,
      createdAt: new Date("2026-02-24T00:00:00.000Z"),
    });
    const { POST } = await import("@/app/api/metrics/readiness/route");

    const req = new Request("http://localhost/api/metrics/readiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readinessPercent: 83,
        completedCount: 5,
        totalCount: 6,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockReadinessCreate).toHaveBeenCalledTimes(1);
    expect(mockReadinessCreate).toHaveBeenCalledWith({
      data: {
        userId: "user_123",
        readinessPercent: 83,
        completedCount: 5,
        totalCount: 6,
      },
    });
  });
});
