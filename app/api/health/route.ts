import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 * Health check endpoint for Docker and monitoring
 */
export async function GET() {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  const healthy = checks.database;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
