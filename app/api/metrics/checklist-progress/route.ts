import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";

const bodySchema = z.object({
  assetsMapped: z.boolean(),
  debtsRecorded: z.boolean(),
  digitalLegacyAdded: z.boolean(),
  wishesCompleted: z.boolean(),
  trustedContactAdded: z.boolean(),
  recoveryKeySaved: z.boolean(),
  recoveryTested: z.boolean(),
}).strict();

export async function POST(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checklist payload" }, { status: 400 });
  }

  const progress = await prisma.userChecklistProgress.upsert({
    where: { userId: user.id },
    update: {
      assetsMapped: parsed.data.assetsMapped,
      debtsRecorded: parsed.data.debtsRecorded,
      digitalLegacyAdded: parsed.data.digitalLegacyAdded,
      wishesCompleted: parsed.data.wishesCompleted,
      trustedContactAdded: parsed.data.trustedContactAdded,
      recoveryKeySaved: parsed.data.recoveryKeySaved,
      recoveryTested: parsed.data.recoveryTested,
    },
    create: {
      userId: user.id,
      assetsMapped: parsed.data.assetsMapped,
      debtsRecorded: parsed.data.debtsRecorded,
      digitalLegacyAdded: parsed.data.digitalLegacyAdded,
      wishesCompleted: parsed.data.wishesCompleted,
      trustedContactAdded: parsed.data.trustedContactAdded,
      recoveryKeySaved: parsed.data.recoveryKeySaved,
      recoveryTested: parsed.data.recoveryTested,
    },
  });

  return NextResponse.json({
    userId: progress.userId,
    updatedAt: progress.updatedAt,
  });
}
