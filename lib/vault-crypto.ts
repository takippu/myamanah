import { argon2id } from "@noble/hashes/argon2.js";

type ArgonParams = {
  algorithm: "argon2id";
  memoryCost: number;
  timeCost: number;
  parallelism: number;
  hashLength: number;
};

export type EncryptedVaultPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
  wrappedDekPass: string;
  wrappedDekRecovery: string;
  saltPass: string;
  saltRecovery: string;
  kdfParams: ArgonParams;
  schemaVersion: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  if (typeof window === "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  if (typeof window === "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function splitCipherAndTag(input: Uint8Array) {
  const tagLength = 16;
  return {
    ciphertext: input.slice(0, input.length - tagLength),
    authTag: input.slice(input.length - tagLength),
  };
}

function combineCipherAndTag(ciphertext: Uint8Array, authTag: Uint8Array): Uint8Array {
  const out = new Uint8Array(ciphertext.length + authTag.length);
  out.set(ciphertext, 0);
  out.set(authTag, ciphertext.length);
  return out;
}

async function deriveAesKey(secret: string, salt: Uint8Array, params: ArgonParams): Promise<CryptoKey> {
  const keyMaterial = argon2id(secret, salt, {
    t: params.timeCost,
    m: params.memoryCost,
    p: params.parallelism,
    dkLen: params.hashLength,
  });
  return crypto.subtle.importKey("raw", toArrayBuffer(keyMaterial), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptWithKey(key: CryptoKey, plaintext: Uint8Array) {
  const iv = randomBytes(12);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(plaintext)),
  );
  const { ciphertext, authTag } = splitCipherAndTag(encrypted);
  return { iv, ciphertext, authTag };
}

async function decryptWithKey(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  authTag: Uint8Array,
) {
  const combined = combineCipherAndTag(ciphertext, authTag);
  const decrypted = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(combined),
    ),
  );
  return decrypted;
}

type WrappedDek = { iv: string; ciphertext: string; authTag: string };

function encodeWrappedDek(value: WrappedDek): string {
  const input = JSON.stringify(value);
  if (typeof window === "undefined") return Buffer.from(input, "utf8").toString("base64");
  return btoa(input);
}

function decodeWrappedDek(input: string): WrappedDek {
  const raw =
    typeof window === "undefined"
      ? Buffer.from(input, "base64").toString("utf8")
      : atob(input);
  return JSON.parse(raw) as WrappedDek;
}

export async function encryptVaultData(
  plaintextJson: string,
  passphrase: string,
  recoveryKey: string,
): Promise<EncryptedVaultPayload> {
  const params: ArgonParams = {
    algorithm: "argon2id",
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    hashLength: 32,
  };

  const saltPass = randomBytes(16);
  const saltRecovery = randomBytes(16);
  const passKey = await deriveAesKey(passphrase, saltPass, params);
  const recoveryCryptoKey = await deriveAesKey(recoveryKey, saltRecovery, params);

  const dekRaw = randomBytes(32);
  const dekKey = await crypto.subtle.importKey("raw", toArrayBuffer(dekRaw), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);

  const encryptedVault = await encryptWithKey(dekKey, encoder.encode(plaintextJson));
  const wrappedPass = await encryptWithKey(passKey, dekRaw);
  const wrappedRecovery = await encryptWithKey(recoveryCryptoKey, dekRaw);

  return {
    ciphertext: toBase64(encryptedVault.ciphertext),
    iv: toBase64(encryptedVault.iv),
    authTag: toBase64(encryptedVault.authTag),
    wrappedDekPass: encodeWrappedDek({
      iv: toBase64(wrappedPass.iv),
      ciphertext: toBase64(wrappedPass.ciphertext),
      authTag: toBase64(wrappedPass.authTag),
    }),
    wrappedDekRecovery: encodeWrappedDek({
      iv: toBase64(wrappedRecovery.iv),
      ciphertext: toBase64(wrappedRecovery.ciphertext),
      authTag: toBase64(wrappedRecovery.authTag),
    }),
    saltPass: toBase64(saltPass),
    saltRecovery: toBase64(saltRecovery),
    kdfParams: params,
    schemaVersion: 1,
  };
}

async function unwrapDek(
  wrapped: string,
  secret: string,
  salt: Uint8Array,
  params: ArgonParams,
): Promise<Uint8Array> {
  const parsed = decodeWrappedDek(wrapped);
  const key = await deriveAesKey(secret, salt, params);
  return decryptWithKey(
    key,
    fromBase64(parsed.iv),
    fromBase64(parsed.ciphertext),
    fromBase64(parsed.authTag),
  );
}

export async function decryptVaultData(
  payload: EncryptedVaultPayload,
  passphrase: string,
  recoveryKey: string,
): Promise<string> {
  const params = payload.kdfParams;
  const saltPass = fromBase64(payload.saltPass);
  const saltRecovery = fromBase64(payload.saltRecovery);

  let dekRaw: Uint8Array | null = null;
  try {
    dekRaw = await unwrapDek(payload.wrappedDekPass, passphrase, saltPass, params);
  } catch {
    dekRaw = await unwrapDek(payload.wrappedDekRecovery, recoveryKey, saltRecovery, params);
  }

  const dekKey = await crypto.subtle.importKey("raw", toArrayBuffer(dekRaw), "AES-GCM", false, [
    "decrypt",
  ]);
  const decrypted = await decryptWithKey(
    dekKey,
    fromBase64(payload.iv),
    fromBase64(payload.ciphertext),
    fromBase64(payload.authTag),
  );

  return decoder.decode(decrypted);
}

export function generateRecoveryKey(): string {
  return Array.from(randomBytes(24))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
