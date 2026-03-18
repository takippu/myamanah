import { DeadmanReleaseStatus, type Prisma, type TrustedContactReleaseChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordReleaseAuditEvent } from "@/lib/release-audit";
import { sendResendEmail } from "@/lib/release-mailer";
import { queueEmailRetry, processEmailRetryQueue } from "@/lib/email-retry";
import {
  calculateDeadline,
  calculateGraceEndsAt,
  calculateRetrievalExpiry,
  createReleaseToken,
  sha256Hex,
  shouldMarkReleaseEmailIgnored,
} from "@/lib/release-utils";

function appBaseUrl(): string {
  return process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

async function sendOwnerGraceEmail(userEmail: string) {
  const dashboardUrl = `${appBaseUrl()}/dashboard`;
  return sendResendEmail({
    to: userEmail,
    subject: "MyAmanah deadman switch grace period started",
    text: `Your MyAmanah deadman switch check-in window was missed. You still have 3 days to check in and prevent trusted-contact release. Review your vault here: ${dashboardUrl}`,
    html: `<p>Your MyAmanah deadman switch check-in window was missed.</p><p>You still have <strong>3 days</strong> to check in and prevent trusted-contact release.</p><p><a href="${dashboardUrl}">Open your vault dashboard</a></p>`,
  });
}

async function sendTrustedContactReleaseEmail(channel: TrustedContactReleaseChannel, token: string) {
  const claimUrl = `${appBaseUrl()}/release/${token}`;
  return sendResendEmail({
    to: channel.releaseEmail,
    subject: "MyAmanah secure retrieval link",
    text: `A MyAmanah encrypted backup has been released to you. Open the secure retrieval link: ${claimUrl}\n\nYou will need the owner's recovery key, shared separately, to open the backup.`,
    html: `<p>A MyAmanah encrypted backup has been released to you.</p><p><a href="${claimUrl}">Open the secure retrieval link</a></p><p>You will need the owner's recovery key, shared separately, to open the backup.</p>`,
  });
}

export async function syncDeadmanCheckIn(userId: string, lastCheckInAt = new Date()) {
  const previous = await prisma.deadmanReleaseState.findUnique({ where: { userId } });
  const next = await prisma.deadmanReleaseState.upsert({
    where: { userId },
    update: {
      status: DeadmanReleaseStatus.armed,
      lastCheckInAt,
      missedAt: null,
      graceEndsAt: null,
      releasedAt: null,
      cancelledAt:
        previous?.status === DeadmanReleaseStatus.grace_period || previous?.status === DeadmanReleaseStatus.released
          ? lastCheckInAt
          : previous?.cancelledAt ?? null,
      ownerWarningSentAt: null,
    },
    create: {
      userId,
      status: DeadmanReleaseStatus.armed,
      lastCheckInAt,
    },
  });

  if (previous?.status === DeadmanReleaseStatus.grace_period || previous?.status === DeadmanReleaseStatus.released) {
    await recordReleaseAuditEvent({
      userId,
      type: "grace_cancelled",
      metadataJson: { cancelledAt: lastCheckInAt.toISOString() } satisfies Prisma.InputJsonValue,
    });
  }

  return next;
}

async function markIgnoredReleaseEmails(now: Date) {
  const expiredTokens = await prisma.releaseRetrievalToken.findMany({
    where: {
      expiresAt: { lte: now },
    },
  });

  for (const token of expiredTokens) {
    const channel = await prisma.trustedContactReleaseChannel.findUnique({
      where: {
        userId_trustedContactId: {
          userId: token.userId,
          trustedContactId: token.trustedContactId,
        },
      },
    });
    if (!channel) continue;
    if (!shouldMarkReleaseEmailIgnored(channel, token.expiresAt, now)) continue;

    await prisma.trustedContactReleaseChannel.update({
      where: {
        userId_trustedContactId: {
          userId: token.userId,
          trustedContactId: token.trustedContactId,
        },
      },
      data: {
        emailIgnored: true,
      },
    });
    await recordReleaseAuditEvent({
      userId: token.userId,
      trustedContactId: token.trustedContactId,
      type: "release_email_ignored",
      metadataJson: { expiredAt: token.expiresAt.toISOString() } satisfies Prisma.InputJsonValue,
    });
  }
}

export async function processDeadmanRelease(userId: string, now = new Date()) {
  // Process any pending email retries first
  await processEmailRetryQueue(now);
  
  await markIgnoredReleaseEmails(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      deadmanReleaseState: true,
      trustedContactReleaseChannels: true,
      vaultBackup: true,
    },
  });
  if (!user) return null;

  const state = user.deadmanReleaseState;
  if (!state?.lastCheckInAt) return state ?? null;

  const deadline = calculateDeadline(state.lastCheckInAt);
  if (now < deadline) {
    if (state.status !== DeadmanReleaseStatus.armed) {
      return prisma.deadmanReleaseState.update({
        where: { userId },
        data: {
          status: DeadmanReleaseStatus.armed,
          missedAt: null,
          graceEndsAt: null,
          releasedAt: null,
          ownerWarningSentAt: null,
        },
      });
    }
    return state;
  }

  if (state.status === DeadmanReleaseStatus.armed || state.status === DeadmanReleaseStatus.cancelled) {
    const missedAt = deadline;
    const graceEndsAt = calculateGraceEndsAt(missedAt);
    await prisma.deadmanReleaseState.update({
      where: { userId },
      data: {
        status: DeadmanReleaseStatus.grace_period,
        missedAt,
        graceEndsAt,
      },
    });
    await recordReleaseAuditEvent({
      userId,
      type: "grace_started",
      metadataJson: {
        missedAt: missedAt.toISOString(),
        graceEndsAt: graceEndsAt.toISOString(),
      } satisfies Prisma.InputJsonValue,
    });
    return processDeadmanRelease(userId, now);
  }

  if (state.status === DeadmanReleaseStatus.grace_period) {
    if (!state.ownerWarningSentAt) {
      try {
        await sendOwnerGraceEmail(user.email);
        await prisma.deadmanReleaseState.update({
          where: { userId },
          data: { ownerWarningSentAt: now },
        });
        await recordReleaseAuditEvent({
          userId,
          type: "owner_warning_sent",
          metadataJson: { emailedAt: now.toISOString() } satisfies Prisma.InputJsonValue,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        // Queue for retry
        await queueEmailRetry(
          {
            userId,
            emailType: "owner_warning",
            recipientEmail: user.email,
            subject: "MyAmanah deadman switch grace period started",
            bodyText: `Your MyAmanah deadman switch check-in window was missed. You still have 3 days to check in and prevent trusted-contact release.`,
            bodyHtml: `<p>Your MyAmanah deadman switch check-in window was missed.</p><p>You still have <strong>3 days</strong> to check in and prevent trusted-contact release.</p>`,
          },
          errorMsg
        );
        await recordReleaseAuditEvent({
          userId,
          type: "release_failed",
          metadataJson: { stage: "owner_warning", message: errorMsg, queuedForRetry: true } satisfies Prisma.InputJsonValue,
        });
      }
    }

    if (!state.graceEndsAt || now < state.graceEndsAt) {
      return prisma.deadmanReleaseState.findUnique({ where: { userId } });
    }

    if (!user.vaultBackup) {
      await recordReleaseAuditEvent({
        userId,
        type: "release_failed",
        metadataJson: { stage: "release", message: "Vault backup missing" } satisfies Prisma.InputJsonValue,
      });
      return prisma.deadmanReleaseState.findUnique({ where: { userId } });
    }

    const channels = user.trustedContactReleaseChannels.filter((channel) => !channel.emailIgnored);
    const releasedAt = now;
    await prisma.deadmanReleaseState.update({
      where: { userId },
      data: {
        status: DeadmanReleaseStatus.released,
        releasedAt,
      },
    });
    await recordReleaseAuditEvent({
      userId,
      type: "release_executed",
      metadataJson: { releasedAt: releasedAt.toISOString(), recipientCount: channels.length } satisfies Prisma.InputJsonValue,
    });

    for (const channel of channels) {
      const rawToken = createReleaseToken();
      await prisma.releaseRetrievalToken.create({
        data: {
          userId,
          trustedContactId: channel.trustedContactId,
          tokenHash: sha256Hex(rawToken),
          expiresAt: calculateRetrievalExpiry(releasedAt),
        },
      });
      await recordReleaseAuditEvent({
        userId,
        trustedContactId: channel.trustedContactId,
        type: "retrieval_token_created",
        metadataJson: { expiresAt: calculateRetrievalExpiry(releasedAt).toISOString() } satisfies Prisma.InputJsonValue,
      });

      try {
        await sendTrustedContactReleaseEmail(channel, rawToken);
        await recordReleaseAuditEvent({
          userId,
          trustedContactId: channel.trustedContactId,
          type: "release_email_sent",
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        const claimUrl = `${appBaseUrl()}/release/${rawToken}`;
        // Queue for retry
        await queueEmailRetry(
          {
            userId,
            trustedContactId: channel.trustedContactId,
            emailType: "contact_release",
            recipientEmail: channel.releaseEmail,
            subject: "MyAmanah secure retrieval link",
            bodyText: `A MyAmanah encrypted backup has been released to you. Open the secure retrieval link: ${claimUrl}\n\nYou will need the owner's recovery key, shared separately, to open the backup.`,
            bodyHtml: `<p>A MyAmanah encrypted backup has been released to you.</p><p><a href="${claimUrl}">Open the secure retrieval link</a></p><p>You will need the owner's recovery key, shared separately, to open the backup.</p>`,
          },
          errorMsg
        );
        await recordReleaseAuditEvent({
          userId,
          trustedContactId: channel.trustedContactId,
          type: "release_failed",
          metadataJson: {
            stage: "contact_release",
            message: errorMsg,
            queuedForRetry: true,
          } satisfies Prisma.InputJsonValue,
        });
      }
    }

    return prisma.deadmanReleaseState.findUnique({ where: { userId } });
  }

  return state;
}
