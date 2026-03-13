import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("Auth middleware", () => {
  it("allows core app routes without a session cookie", () => {
    const req = new NextRequest("http://localhost/dashboard");
    const res = middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("still allows core app routes when better-auth session cookie exists", () => {
    const req = new NextRequest("http://localhost/dashboard", {
      headers: { cookie: "better-auth.session_token=test_token" },
    });
    const res = middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects /login to /dashboard when already authenticated", () => {
    const req = new NextRequest("http://localhost/login", {
      headers: { cookie: "better-auth.session_token=test_token" },
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
  });
});
