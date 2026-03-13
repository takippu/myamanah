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
