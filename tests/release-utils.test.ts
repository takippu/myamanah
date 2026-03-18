import { describe, expect, it } from "vitest";
import { shouldMarkReleaseEmailIgnored } from "@/lib/release-utils";

describe("shouldMarkReleaseEmailIgnored", () => {
  const expiresAt = new Date("2026-03-14T00:00:00.000Z");
  const afterExpiry = new Date("2026-03-14T00:00:01.000Z");

  it("returns false before expiry", () => {
    expect(
      shouldMarkReleaseEmailIgnored(
        {
          firstViewedAt: null,
          downloadedAt: null,
          acceptedAt: null,
          emailIgnored: false,
        },
        expiresAt,
        new Date("2026-03-13T23:59:59.000Z"),
      ),
    ).toBe(false);
  });

  it("returns true after expiry when the claim page was never viewed", () => {
    expect(
      shouldMarkReleaseEmailIgnored(
        {
          firstViewedAt: null,
          downloadedAt: new Date("2026-03-13T20:00:00.000Z"),
          acceptedAt: new Date("2026-03-13T20:05:00.000Z"),
          emailIgnored: false,
        },
        expiresAt,
        afterExpiry,
      ),
    ).toBe(true);
  });

  it("returns true after expiry when the package was not downloaded", () => {
    expect(
      shouldMarkReleaseEmailIgnored(
        {
          firstViewedAt: new Date("2026-03-13T20:00:00.000Z"),
          downloadedAt: null,
          acceptedAt: new Date("2026-03-13T20:05:00.000Z"),
          emailIgnored: false,
        },
        expiresAt,
        afterExpiry,
      ),
    ).toBe(true);
  });

  it("returns true after expiry when acceptance was never recorded", () => {
    expect(
      shouldMarkReleaseEmailIgnored(
        {
          firstViewedAt: new Date("2026-03-13T20:00:00.000Z"),
          downloadedAt: new Date("2026-03-13T20:01:00.000Z"),
          acceptedAt: null,
          emailIgnored: false,
        },
        expiresAt,
        afterExpiry,
      ),
    ).toBe(true);
  });

  it("returns false once all release steps were completed before expiry", () => {
    expect(
      shouldMarkReleaseEmailIgnored(
        {
          firstViewedAt: new Date("2026-03-13T20:00:00.000Z"),
          downloadedAt: new Date("2026-03-13T20:01:00.000Z"),
          acceptedAt: new Date("2026-03-13T20:02:00.000Z"),
          emailIgnored: false,
        },
        expiresAt,
        afterExpiry,
      ),
    ).toBe(false);
  });
});
