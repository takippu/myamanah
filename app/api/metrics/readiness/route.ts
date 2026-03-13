import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromRequest } from "@/lib/auth";

const bodySchema = z.object({
  readinessPercent: z.number().int().min(0).max(100),
  completedCount: z.number().int().min(0),
  totalCount: z.number().int().min(0),
}).strict();

export async function POST(req: Request) {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid readiness payload" }, { status: 400 });
  }

  const created = await prisma.userReadinessSnapshot.create({
    data: {
      userId: user.id,
      readinessPercent: parsed.data.readinessPercent,
      completedCount: parsed.data.completedCount,
      totalCount: parsed.data.totalCount,
    },
  });

  return NextResponse.json({
    id: created.id,
    readinessPercent: created.readinessPercent,
    completedCount: created.completedCount,
    totalCount: created.totalCount,
    createdAt: created.createdAt,
  });
}
