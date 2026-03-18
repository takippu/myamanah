import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";

function sanitizeMetadata(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value ?? null;
  }

  const source = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "cancelledAt",
    "emailedAt",
    "expiredAt",
    "expiresAt",
    "graceEndsAt",
    "message",
    "missedAt",
    "recipientCount",
    "releasedAt",
    "stage",
  ]);

  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (allowedKeys.has(key)) {
      next[key] = entry;
    }
  }
  return next;
}

export async function GET(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const takeParam = Number.parseInt(searchParams.get("take") ?? "20", 10);
  const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 50) : 20;

  const events = await prisma.releaseAuditEvent.findMany({
    where: { userId: user.id },
    orderBy: { occurredAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      occurredAt: true,
      trustedContactId: true,
      metadataJson: true,
    },
  });

  return NextResponse.json({
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      occurredAt: event.occurredAt,
      trustedContactId: event.trustedContactId,
      metadata: sanitizeMetadata(event.metadataJson),
    })),
  });
}
