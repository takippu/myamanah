import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processDeadmanRelease } from "@/lib/deadman-release";
import { processEmailRetryQueue, cleanupEmailRetryQueue } from "@/lib/email-retry";

function isAuthorized(req: Request): boolean {
  const secret = process.env.DEADMAN_CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  
  // Process any pending email retries first
  const retryResults = await processEmailRetryQueue(now);
  
  // Process deadman releases for all users
  const users = await prisma.deadmanReleaseState.findMany({
    select: { userId: true },
  });
  const results = await Promise.all(users.map((entry) => processDeadmanRelease(entry.userId, now)));
  
  // Cleanup old completed entries (older than 7 days)
  const cleanedCount = await cleanupEmailRetryQueue(7);

  return NextResponse.json({
    processed: results.length,
    retriesProcessed: retryResults.length,
    retriesSuccessful: retryResults.filter(r => r.status === "sent").length,
    retriesFailed: retryResults.filter(r => r.status === "failed").length,
    cleanedEntries: cleanedCount,
  });
}
