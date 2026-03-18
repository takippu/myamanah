import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth";
import { syncDeadmanCheckIn } from "@/lib/deadman-release";

export async function POST() {
  const user = await getAuthUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = await syncDeadmanCheckIn(user.id, new Date());
  return NextResponse.json({
    status: state.status,
    lastCheckInAt: state.lastCheckInAt,
  });
}
