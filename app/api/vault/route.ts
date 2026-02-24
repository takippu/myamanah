import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptedVaultPayloadSchema } from "@/lib/vault-schema";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vault = await prisma.vault.findUnique({ where: { userId: user.id } });
  if (!vault) {
    return NextResponse.json({ error: "Vault not found" }, { status: 404 });
  }

  return NextResponse.json({
    ciphertext: vault.ciphertext,
    iv: vault.iv,
    authTag: vault.authTag,
    wrappedDekPass: vault.wrappedDekPass,
    wrappedDekRecovery: vault.wrappedDekRecovery,
    saltPass: vault.saltPass,
    saltRecovery: vault.saltRecovery,
    kdfParams: vault.kdfParams,
    schemaVersion: vault.schemaVersion,
    recoveryVerifiedAt: vault.recoveryVerifiedAt,
    updatedAt: vault.updatedAt,
  });
}

export async function PUT(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = encryptedVaultPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid encrypted payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.vault.upsert({
    where: { userId: user.id },
    update: {
      ...parsed.data,
    },
    create: {
      userId: user.id,
      ...parsed.data,
    },
  });

  return NextResponse.json({
    userId: updated.userId,
    schemaVersion: updated.schemaVersion,
    updatedAt: updated.updatedAt,
  });
}
