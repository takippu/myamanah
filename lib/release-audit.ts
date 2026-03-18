import type { Prisma, ReleaseAuditEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function recordReleaseAuditEvent(args: {
  userId: string;
  type: ReleaseAuditEventType;
  trustedContactId?: string | null;
  metadataJson?: Prisma.InputJsonValue;
}) {
  return prisma.releaseAuditEvent.create({
    data: {
      userId: args.userId,
      type: args.type,
      trustedContactId: args.trustedContactId ?? null,
      metadataJson: args.metadataJson,
    },
  });
}
