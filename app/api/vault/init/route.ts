import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptedVaultPayloadSchema } from "@/lib/vault-schema";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
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

  const existing = await prisma.vault.findUnique({ where: { userId: user.id } });
  if (existing) {
    return NextResponse.json({ error: "Vault already initialized" }, { status: 409 });
  }

  const created = await prisma.vault.create({
    data: {
      userId: user.id,
      ...parsed.data,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      userId: created.userId,
      schemaVersion: created.schemaVersion,
      createdAt: created.createdAt,
    },
    { status: 201 },
  );
}
