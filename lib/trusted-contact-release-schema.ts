import { z } from "zod";

export const trustedContactReleaseChannelSchema = z.object({
  trustedContactId: z.string().min(1),
  releaseEmail: z.email(),
  phoneNumber: z.string().trim().max(40).optional().nullable(),
});

export const trustedContactReleaseChannelDeleteSchema = z.object({
  trustedContactId: z.string().min(1),
});
