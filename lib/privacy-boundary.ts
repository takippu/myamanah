export const SENSITIVE_VAULT_SECTIONS = [
  "assets",
  "debts",
  "digitalLegacy",
  "wishes",
  "trustedContacts",
] as const;

export const CHECKLIST_PROGRESS_FIELDS = [
  "assetsMapped",
  "debtsRecorded",
  "digitalLegacyAdded",
  "wishesCompleted",
  "trustedContactAdded",
  "recoveryKeySaved",
  "recoveryTested",
] as const;

export const READINESS_FIELDS = [
  "readinessPercent",
  "completedCount",
  "totalCount",
] as const;

export const QUERYABLE_SERVER_MODELS = {
  user: ["id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"],
  account: [
    "id",
    "accountId",
    "providerId",
    "userId",
    "accessToken",
    "refreshToken",
    "idToken",
    "accessTokenExpiresAt",
    "refreshTokenExpiresAt",
    "scope",
    "password",
    "createdAt",
    "updatedAt",
  ],
  session: ["id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId"],
  consent: ["id", "userId", "backupEnabled", "consentedAt", "revokedAt", "updatedAt"],
  readiness: READINESS_FIELDS,
  checklist: CHECKLIST_PROGRESS_FIELDS,
} as const;
