import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVaultBackup } from "@/lib/sqlite-backup";
import { recordReleaseAuditEvent } from "@/lib/release-audit";
import { sha256Hex, shouldMarkReleaseEmailIgnored } from "@/lib/release-utils";

async function getReleaseTokenRecord(rawToken: string) {
  const tokenHash = sha256Hex(rawToken);
  return prisma.releaseRetrievalToken.findUnique({
    where: { tokenHash },
  });
}

async function markIgnoredIfNeeded(userId: string, trustedContactId: string, expiresAt: Date) {
  const channel = await prisma.trustedContactReleaseChannel.findUnique({
    where: {
      userId_trustedContactId: {
        userId,
        trustedContactId,
      },
    },
  });
  if (!channel) return;
  if (!shouldMarkReleaseEmailIgnored(channel, expiresAt)) return;

  await prisma.trustedContactReleaseChannel.update({
    where: {
      userId_trustedContactId: {
        userId,
        trustedContactId,
      },
    },
    data: {
      emailIgnored: true,
    },
  });
  await recordReleaseAuditEvent({
    userId,
    trustedContactId,
    type: "release_email_ignored",
    metadataJson: { expiredAt: expiresAt.toISOString() },
  });
}

/**
 * GET /api/release/[token]
 * View release link status (does not expose encrypted data)
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const params = await context.params;
  const token = await getReleaseTokenRecord(params.token);
  if (!token) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (token.expiresAt <= new Date()) {
    await markIgnoredIfNeeded(token.userId, token.trustedContactId, token.expiresAt);
    await recordReleaseAuditEvent({
      userId: token.userId,
      trustedContactId: token.trustedContactId,
      type: "retrieval_expired",
      metadataJson: { expiredAt: token.expiresAt.toISOString() },
    });
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  const channel = await prisma.trustedContactReleaseChannel.update({
    where: {
      userId_trustedContactId: {
        userId: token.userId,
        trustedContactId: token.trustedContactId,
      },
    },
    data: {
      firstViewedAt: new Date(),
    },
  });
  await recordReleaseAuditEvent({
    userId: token.userId,
    trustedContactId: token.trustedContactId,
    type: "retrieval_viewed",
  });

  return NextResponse.json({
    expiresAt: token.expiresAt,
    firstViewedAt: channel.firstViewedAt,
    downloadedAt: channel.downloadedAt,
    acceptedAt: channel.acceptedAt,
    requiresRecoveryKey: true,
    message:
      "This secure retrieval link only provides the encrypted backup. You still need the owner's separately shared recovery key to open it.",
  });
}

/**
 * POST /api/release/[token]
 * Download encrypted backup or accept release
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> },
) {
  const params = await context.params;
  const token = await getReleaseTokenRecord(params.token);
  if (!token) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (token.expiresAt <= new Date()) {
    await markIgnoredIfNeeded(token.userId, token.trustedContactId, token.expiresAt);
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  const body = (await req.json().catch(() => null)) as { action?: "accept" | "download" } | null;
  if (!body?.action) {
    return NextResponse.json({ error: "Action required" }, { status: 400 });
  }

  if (body.action === "accept") {
    const channel = await prisma.trustedContactReleaseChannel.update({
      where: {
        userId_trustedContactId: {
          userId: token.userId,
          trustedContactId: token.trustedContactId,
        },
      },
      data: {
        acceptedAt: new Date(),
      },
    });
    await recordReleaseAuditEvent({
      userId: token.userId,
      trustedContactId: token.trustedContactId,
      type: "retrieval_accepted",
    });
    return NextResponse.json({ acceptedAt: channel.acceptedAt });
  }

  // Download action - retrieve from SQLite
  const backup = await getVaultBackup(token.userId);
  if (!backup) {
    return NextResponse.json({ error: "Encrypted backup unavailable" }, { status: 404 });
  }

  const channel = await prisma.trustedContactReleaseChannel.update({
    where: {
      userId_trustedContactId: {
        userId: token.userId,
        trustedContactId: token.trustedContactId,
      },
    },
    data: {
      downloadedAt: new Date(),
    },
  });
  await prisma.releaseRetrievalToken.update({
    where: { tokenHash: token.tokenHash },
    data: { usedAt: channel.downloadedAt },
  });
  await recordReleaseAuditEvent({
    userId: token.userId,
    trustedContactId: token.trustedContactId,
    type: "retrieval_downloaded",
  });

  return NextResponse.json({
    fileName: "myamanah-vault-backup.json",
    encryptedPayload: backup.payload,
  });
}
