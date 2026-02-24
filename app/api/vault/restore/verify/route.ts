import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vault = await prisma.vault.findUnique({ where: { userId: user.id } });
  if (!vault) {
    return NextResponse.json({ error: "Vault not found" }, { status: 404 });
  }

  const updated = await prisma.vault.update({
    where: { userId: user.id },
    data: {
      recoveryVerifiedAt: new Date(),
    },
  });

  return NextResponse.json({
    userId: updated.userId,
    recoveryVerifiedAt: updated.recoveryVerifiedAt,
  });
}
