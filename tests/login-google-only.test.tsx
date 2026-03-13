import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage from "@/app/login/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
    },
  },
}));

describe("Login page", () => {
  it("renders Google-only sign-in CTA", () => {
    const html = renderToStaticMarkup(<LoginPage />);
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Google account");
    expect(html).not.toContain("OTP");
    expect(html).not.toContain("email");
  });
});
