import { z } from "zod";

export const kdfParamsSchema = z.object({
  algorithm: z.literal("argon2id"),
  memoryCost: z.number().int().positive(),
  timeCost: z.number().int().positive(),
  parallelism: z.number().int().positive(),
  hashLength: z.number().int().positive(),
});

export const encryptedVaultPayloadSchema = z.object({
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  authTag: z.string().min(1),
  wrappedDekPass: z.string().min(1),
  wrappedDekRecovery: z.string().min(1),
  saltPass: z.string().min(1),
  saltRecovery: z.string().min(1),
  kdfParams: kdfParamsSchema,
  schemaVersion: z.number().int().positive().default(1),
});

export type EncryptedVaultPayload = z.infer<typeof encryptedVaultPayloadSchema>;

export function getOwnerKeyFromHeaders(headers: Headers): string | null {
  const ownerKey = headers.get("x-owner-key")?.trim();
  if (!ownerKey) return null;
  if (ownerKey.length < 8) return null;
  return ownerKey;
}

function parseCookie(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, ...rest] = pair.trim().split("=");
    if (!rawKey || rest.length === 0) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

export function getOwnerKeyFromRequest(req: Request): string | null {
  const fromHeader = getOwnerKeyFromHeaders(req.headers);
  if (fromHeader) return fromHeader;
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = parseCookie(cookieHeader);
  const fromCookie = cookies.owner_key?.trim();
  if (!fromCookie || fromCookie.length < 8) return null;
  return fromCookie;
}
