import { createHash, randomBytes } from "node:crypto";
import type { TrustedContactReleaseChannel } from "@prisma/client";

export const DEADMAN_INTERVAL_DAYS = 30;
export const DEADMAN_GRACE_DAYS = 3;
export const RELEASE_RETRIEVAL_DAYS = 7;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createBackupFingerprint(payloadJson: string): string {
  return sha256Hex(payloadJson);
}

export function createReleaseToken(): string {
  return randomBytes(24).toString("hex");
}

export function calculateDeadline(lastCheckInAt: Date): Date {
  const next = new Date(lastCheckInAt);
  next.setUTCDate(next.getUTCDate() + DEADMAN_INTERVAL_DAYS);
  return next;
}

export function calculateGraceEndsAt(missedAt: Date): Date {
  const next = new Date(missedAt);
  next.setUTCDate(next.getUTCDate() + DEADMAN_GRACE_DAYS);
  return next;
}

export function calculateRetrievalExpiry(releasedAt: Date): Date {
  const next = new Date(releasedAt);
  next.setUTCDate(next.getUTCDate() + RELEASE_RETRIEVAL_DAYS);
  return next;
}

export function shouldMarkReleaseEmailIgnored(
  channel: Pick<
    TrustedContactReleaseChannel,
    "firstViewedAt" | "downloadedAt" | "acceptedAt" | "emailIgnored"
  >,
  expiresAt: Date,
  now = new Date(),
): boolean {
  if (channel.emailIgnored) return false;
  if (now < expiresAt) return false;
  return !channel.firstViewedAt || !channel.downloadedAt || !channel.acceptedAt;
}
