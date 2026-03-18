import { headers } from "next/headers";
import { auth } from "@/lib/better-auth";
import {
  GOOGLE_DRIVE_BACKUP_FILE_NAME,
} from "@/lib/google-drive-constants";

type AccessTokenPayload = {
  accessToken?: string;
};

type DriveFileRecord = {
  id: string;
  name?: string;
  modifiedTime?: string;
};

function googleDriveHeaders(accessToken: string, contentType?: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

async function getGoogleAccessTokenForUser(userId: string): Promise<string> {
  const requestHeaders = await headers().catch(() => null);
  const payload = (await auth.api.getAccessToken({
    headers: requestHeaders ?? undefined,
    body: {
      providerId: "google",
      userId,
    },
  })) as AccessTokenPayload | null;

  if (!payload?.accessToken) {
    throw new Error("Google Drive access token unavailable.");
  }

  return payload.accessToken;
}

async function ensureDriveResponseOk(response: Response, action: string) {
  if (response.ok) return;
  const body = await response.text().catch(() => "");
  throw new Error(`${action} failed: ${response.status}${body ? ` ${body}` : ""}`);
}

async function listBackupFiles(accessToken: string): Promise<DriveFileRecord[]> {
  const q = encodeURIComponent(
    `name='${GOOGLE_DRIVE_BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`,
  );
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)`,
    {
      headers: googleDriveHeaders(accessToken),
      cache: "no-store",
    },
  );
  await ensureDriveResponseOk(response, "Google Drive file lookup");
  const payload = (await response.json()) as { files?: DriveFileRecord[] };
  return payload.files ?? [];
}

export async function findGoogleDriveBackupFile(userId: string): Promise<DriveFileRecord | null> {
  const accessToken = await getGoogleAccessTokenForUser(userId);
  const files = await listBackupFiles(accessToken);
  return files[0] ?? null;
}

export async function createGoogleDriveBackupFile(
  userId: string,
  content: string,
): Promise<DriveFileRecord> {
  const accessToken = await getGoogleAccessTokenForUser(userId);
  const boundary = `myamanah-${Date.now().toString(36)}`;
  const metadata = JSON.stringify({
    name: GOOGLE_DRIVE_BACKUP_FILE_NAME,
    parents: ["appDataFolder"],
  });
  const multipartBody = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    content,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime",
    {
      method: "POST",
      headers: googleDriveHeaders(accessToken, `multipart/related; boundary=${boundary}`),
      body: multipartBody,
    },
  );
  await ensureDriveResponseOk(response, "Google Drive file create");
  return (await response.json()) as DriveFileRecord;
}

export async function updateGoogleDriveBackupFile(
  userId: string,
  fileId: string,
  content: string,
): Promise<DriveFileRecord> {
  const accessToken = await getGoogleAccessTokenForUser(userId);
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,modifiedTime`,
    {
      method: "PATCH",
      headers: googleDriveHeaders(accessToken, "application/json; charset=UTF-8"),
      body: content,
    },
  );
  await ensureDriveResponseOk(response, "Google Drive file update");
  return (await response.json()) as DriveFileRecord;
}

export async function downloadGoogleDriveBackupFile(
  userId: string,
  fileId: string,
): Promise<string> {
  const accessToken = await getGoogleAccessTokenForUser(userId);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: googleDriveHeaders(accessToken),
      cache: "no-store",
    },
  );
  await ensureDriveResponseOk(response, "Google Drive file download");
  return response.text();
}

export async function deleteGoogleDriveBackupFile(userId: string, fileId: string): Promise<void> {
  const accessToken = await getGoogleAccessTokenForUser(userId);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: googleDriveHeaders(accessToken),
    },
  );
  await ensureDriveResponseOk(response, "Google Drive file delete");
}
