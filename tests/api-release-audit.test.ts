import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetAuthUserFromRequest = vi.fn();
const mockReleaseAuditFindMany = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthUserFromRequest: mockGetAuthUserFromRequest,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    releaseAuditEvent: {
      findMany: mockReleaseAuditFindMany,
    },
  },
}));

describe("Release audit history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUserFromRequest.mockResolvedValue({ id: "user_123" });
  });

  it("returns sanitized operational history without exposing raw delivery metadata", async () => {
    mockReleaseAuditFindMany.mockResolvedValue([
      {
        id: "evt_1",
        type: "release_failed",
        occurredAt: new Date("2026-03-14T12:00:00.000Z"),
        trustedContactId: "contact_1",
        metadataJson: {
          stage: "contact_release",
          message: "Mailbox unavailable",
          releaseEmail: "secret@example.com",
          tokenHash: "should-not-leak",
        },
      },
    ]);

    const { GET } = await import("@/app/api/release/audit/route");
    const res = await GET(new Request("http://localhost/api/release/audit?take=10"));
    const body = (await res.json()) as {
      events?: Array<{ metadata?: Record<string, unknown> }>;
    };

    expect(res.status).toBe(200);
    expect(body.events).toHaveLength(1);
    expect(body.events?.[0]?.metadata).toEqual({
      stage: "contact_release",
      message: "Mailbox unavailable",
    });
  });
});
