import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function read(projectPath: string) {
  return fs.readFileSync(path.resolve(process.cwd(), projectPath), "utf8");
}

describe("Confidential payload logging guard", () => {
  it("does not log vault payloads in client/server metrics and vault routes", () => {
    const files = [
      "lib/vault-client.ts",
      "lib/vault-metrics.ts",
      "app/api/metrics/readiness/route.ts",
      "app/api/metrics/checklist-progress/route.ts",
      "app/api/vault/route.ts",
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/console\.(log|info|debug|warn|error)\(/);
      expect(source).not.toContain("JSON.stringify(vaultData)");
      expect(source).not.toContain("Invalid encrypted payload\", details:");
    }
  });
});
