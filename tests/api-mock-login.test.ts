import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserUpsert = vi.fn();
const mockSessionCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: mockUserUpsert,
    },
    session: {
      create: mockSessionCreate,
    },
  },
}));

describe("Mock login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MOCK_LOGIN_ENABLED;
  });

  it("creates a real session cookie and db session when enabled", async () => {
    process.env.MOCK_LOGIN_ENABLED = "true";
    mockUserUpsert.mockResolvedValue({
      id: "user_demo",
      email: "demo@myamanah.local",
      name: "Demo User",
    });
    mockSessionCreate.mockResolvedValue({});

    const { POST } = await import("@/app/api/auth/mock-login/route");
    const res = await POST();
    const body = (await res.json()) as { ok?: boolean };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockUserUpsert).toHaveBeenCalledTimes(1);
    expect(mockSessionCreate).toHaveBeenCalledTimes(1);

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("better-auth.session_token=");
  });

  it("returns 403 in production when not explicitly enabled", async () => {
    const nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const { POST } = await import("@/app/api/auth/mock-login/route");
      const res = await POST();
      expect(res.status).toBe(403);
    } finally {
      process.env.NODE_ENV = nodeEnv;
    }
  });
});
