import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";
import {
  trustedContactReleaseChannelDeleteSchema,
  trustedContactReleaseChannelSchema,
} from "@/lib/trusted-contact-release-schema";

export async function GET() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channels = await prisma.trustedContactReleaseChannel.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ channels });
}

export async function PUT(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = trustedContactReleaseChannelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid release channel payload" }, { status: 400 });
  }

  const channel = await prisma.trustedContactReleaseChannel.upsert({
    where: {
      userId_trustedContactId: {
        userId: user.id,
        trustedContactId: parsed.data.trustedContactId,
      },
    },
    update: {
      releaseEmail: parsed.data.releaseEmail,
      phoneNumber: parsed.data.phoneNumber?.trim() || null,
      emailIgnored: false,
    },
    create: {
      userId: user.id,
      trustedContactId: parsed.data.trustedContactId,
      releaseEmail: parsed.data.releaseEmail,
      phoneNumber: parsed.data.phoneNumber?.trim() || null,
    },
  });

  return NextResponse.json({ channel });
}

export async function DELETE(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = trustedContactReleaseChannelDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delete payload" }, { status: 400 });
  }

  await prisma.trustedContactReleaseChannel.deleteMany({
    where: {
      userId: user.id,
      trustedContactId: parsed.data.trustedContactId,
    },
  });

  return NextResponse.json({ ok: true });
}
