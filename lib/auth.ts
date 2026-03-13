import { headers } from "next/headers";
import { auth } from "@/lib/better-auth";

export async function getAuthUserFromRequest() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user ?? null;
}
