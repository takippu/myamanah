import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "session_token";
const ACCESS_SETUP_COOKIE = "vault_setup";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashOtp(email: string, code: string): string {
  return sha256(`${email.toLowerCase()}::${code}`);
}

export function verifyOtpHash(email: string, code: string, hash: string): boolean {
  const candidate = Buffer.from(hashOtp(email, code), "hex");
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return sha256(token);
}

export async function getAuthUserFromRequest() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { tokenHash } }).catch(() => null);
    return null;
  }
  return session.user;
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function accessSetupCookieName() {
  return ACCESS_SETUP_COOKIE;
}
