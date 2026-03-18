import { prisma } from "@/lib/prisma";
import { sendResendEmail } from "@/lib/release-mailer";
import { recordReleaseAuditEvent } from "@/lib/release-audit";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000]; // 5min, 15min, 1hour

// Safely check if EmailRetryQueue table exists (for migration compatibility)
async function isRetryQueueAvailable(): Promise<boolean> {
  try {
    // Try a harmless query to check if table exists
    await (prisma as unknown as { emailRetryQueue: { count: () => Promise<number> } }).emailRetryQueue.count();
    return true;
  } catch {
    return false;
  }
}

export interface EmailRetryPayload {
  userId: string;
  trustedContactId?: string;
  emailType: "owner_warning" | "contact_release";
  recipientEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
}

/**
 * Queue an email for retry if it fails
 */
export async function queueEmailRetry(payload: EmailRetryPayload, errorMessage?: string) {
  if (!(await isRetryQueueAvailable())) {
    console.warn("Email retry queue not available - email failed but not queued for retry");
    return;
  }
  
  const nextAttemptAt = new Date(Date.now() + RETRY_DELAYS_MS[0]);
  
  await (prisma as unknown as { emailRetryQueue: { create: (args: unknown) => Promise<unknown> } }).emailRetryQueue.create({
    data: {
      userId: payload.userId,
      trustedContactId: payload.trustedContactId,
      emailType: payload.emailType,
      recipientEmail: payload.recipientEmail,
      subject: payload.subject,
      bodyText: payload.bodyText,
      bodyHtml: payload.bodyHtml,
      attemptCount: 1,
      lastAttemptAt: new Date(),
      nextAttemptAt,
      status: "pending",
      errorMessage: errorMessage?.slice(0, 500),
    },
  });
}

/**
 * Process pending emails in the retry queue
 * Called by the deadman cron job
 */
export async function processEmailRetryQueue(now = new Date()) {
  if (!(await isRetryQueueAvailable())) {
    return []; // Queue not available yet (migration pending)
  }
  
  const pendingEmails = await (prisma as unknown as { emailRetryQueue: { findMany: (args: unknown) => Promise<Array<{ id: string; userId: string; trustedContactId: string | null; emailType: string; recipientEmail: string; subject: string; bodyText: string; bodyHtml: string; attemptCount: number }>> } }).emailRetryQueue.findMany({
    where: {
      status: "pending",
      nextAttemptAt: { lte: now },
    },
    take: 10, // Process in batches
  });

  const results = await Promise.all(
    pendingEmails.map(async (email) => {
      try {
        // Mark as processing
        await (prisma as unknown as { emailRetryQueue: { update: (args: unknown) => Promise<unknown> } }).emailRetryQueue.update({
          where: { id: email.id },
          data: { status: "processing" },
        });

        // Attempt to send
        await sendResendEmail({
          to: email.recipientEmail,
          subject: email.subject,
          text: email.bodyText,
          html: email.bodyHtml,
        });

        // Success - mark as sent
        await (prisma as unknown as { emailRetryQueue: { update: (args: unknown) => Promise<unknown> } }).emailRetryQueue.update({
          where: { id: email.id },
          data: { status: "sent" },
        });

        await recordReleaseAuditEvent({
          userId: email.userId,
          trustedContactId: email.trustedContactId ?? undefined,
          type: email.emailType === "owner_warning" ? "owner_warning_sent" : "release_email_sent",
          metadataJson: { retryAttempt: email.attemptCount, queued: true },
        });

        return { id: email.id, status: "sent" };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        const nextAttempt = email.attemptCount + 1;

        if (nextAttempt >= MAX_RETRY_ATTEMPTS) {
          // Max retries reached - mark as failed
          await (prisma as unknown as { emailRetryQueue: { update: (args: unknown) => Promise<unknown> } }).emailRetryQueue.update({
            where: { id: email.id },
            data: {
              status: "failed",
              attemptCount: nextAttempt,
              errorMessage: errorMsg.slice(0, 500),
            },
          });

          await recordReleaseAuditEvent({
            userId: email.userId,
            trustedContactId: email.trustedContactId ?? undefined,
            type: "release_failed",
            metadataJson: {
              stage: email.emailType,
              message: `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${errorMsg}`,
              finalAttempt: true,
            },
          });

          return { id: email.id, status: "failed", error: errorMsg };
        }

        // Schedule next retry
        const nextDelay = RETRY_DELAYS_MS[Math.min(nextAttempt - 1, RETRY_DELAYS_MS.length - 1)];
        await (prisma as unknown as { emailRetryQueue: { update: (args: unknown) => Promise<unknown> } }).emailRetryQueue.update({
          where: { id: email.id },
          data: {
            status: "pending",
            attemptCount: nextAttempt,
            lastAttemptAt: new Date(),
            nextAttemptAt: new Date(Date.now() + nextDelay),
            errorMessage: errorMsg.slice(0, 500),
          },
        });

        return { id: email.id, status: "retry_scheduled", nextAttempt };
      }
    })
  );

  return results;
}

/**
 * Get queue status for debugging/monitoring
 */
export async function getEmailRetryQueueStatus(userId?: string) {
  if (!(await isRetryQueueAvailable())) {
    return { pending: 0, failed: 0, sent: 0, total: 0 };
  }
  
  const where = userId ? { userId } : {};
  const emailRetryQueue = (prisma as unknown as { emailRetryQueue: { count: (args?: unknown) => Promise<number> } }).emailRetryQueue;
  
  const [pending, failed, sent, total] = await Promise.all([
    emailRetryQueue.count({ where: { ...where, status: "pending" } }),
    emailRetryQueue.count({ where: { ...where, status: "failed" } }),
    emailRetryQueue.count({ where: { ...where, status: "sent" } }),
    emailRetryQueue.count({ where }),
  ]);

  return { pending, failed, sent, total };
}

/**
 * Clear old completed entries (maintenance)
 */
export async function cleanupEmailRetryQueue(olderThanDays = 7) {
  if (!(await isRetryQueueAvailable())) {
    return 0;
  }
  
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const result = await (prisma as unknown as { emailRetryQueue: { deleteMany: (args: unknown) => Promise<{ count: number }> } }).emailRetryQueue.deleteMany({
    where: {
      status: { in: ["sent", "failed"] },
      updatedAt: { lt: cutoff },
    },
  });

  return result.count;
}
