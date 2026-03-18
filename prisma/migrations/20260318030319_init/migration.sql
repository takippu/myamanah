-- CreateTable
CREATE TABLE "Vault" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "wrappedDekPass" TEXT NOT NULL,
    "wrappedDekRecovery" TEXT NOT NULL,
    "saltPass" TEXT NOT NULL,
    "saltRecovery" TEXT NOT NULL,
    "kdfParams" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "recoveryVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vault_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserReadinessSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "readinessPercent" INTEGER NOT NULL,
    "completedCount" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserReadinessSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserChecklistProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "assetsMapped" BOOLEAN NOT NULL DEFAULT false,
    "debtsRecorded" BOOLEAN NOT NULL DEFAULT false,
    "digitalLegacyAdded" BOOLEAN NOT NULL DEFAULT false,
    "wishesCompleted" BOOLEAN NOT NULL DEFAULT false,
    "trustedContactAdded" BOOLEAN NOT NULL DEFAULT false,
    "recoveryKeySaved" BOOLEAN NOT NULL DEFAULT false,
    "recoveryTested" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserChecklistProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPrivacyConsent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "backupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "consentedAt" DATETIME,
    "revokedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPrivacyConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VaultBackup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "wrappedDekPass" TEXT NOT NULL,
    "wrappedDekRecovery" TEXT NOT NULL,
    "saltPass" TEXT NOT NULL,
    "saltRecovery" TEXT NOT NULL,
    "kdfParams" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "lastBackedUpAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backupFingerprint" TEXT NOT NULL,
    "recoveryVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VaultBackup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeadmanReleaseState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'armed',
    "lastCheckInAt" DATETIME,
    "missedAt" DATETIME,
    "graceEndsAt" DATETIME,
    "releasedAt" DATETIME,
    "cancelledAt" DATETIME,
    "ownerWarningSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeadmanReleaseState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrustedContactReleaseChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trustedContactId" TEXT NOT NULL,
    "releaseEmail" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "emailIgnored" BOOLEAN NOT NULL DEFAULT false,
    "firstViewedAt" DATETIME,
    "downloadedAt" DATETIME,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrustedContactReleaseChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReleaseRetrievalToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trustedContactId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReleaseRetrievalToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReleaseAuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trustedContactId" TEXT,
    "type" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" JSONB,
    CONSTRAINT "ReleaseAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailRetryQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trustedContactId" TEXT,
    "emailType" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" DATETIME,
    "nextAttemptAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Vault_userId_key" ON "Vault"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "UserReadinessSnapshot_userId_createdAt_idx" ON "UserReadinessSnapshot"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserChecklistProgress_userId_key" ON "UserChecklistProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPrivacyConsent_userId_key" ON "UserPrivacyConsent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultBackup_userId_key" ON "VaultBackup"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeadmanReleaseState_userId_key" ON "DeadmanReleaseState"("userId");

-- CreateIndex
CREATE INDEX "TrustedContactReleaseChannel_userId_idx" ON "TrustedContactReleaseChannel"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustedContactReleaseChannel_userId_trustedContactId_key" ON "TrustedContactReleaseChannel"("userId", "trustedContactId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseRetrievalToken_tokenHash_key" ON "ReleaseRetrievalToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ReleaseRetrievalToken_userId_trustedContactId_idx" ON "ReleaseRetrievalToken"("userId", "trustedContactId");

-- CreateIndex
CREATE INDEX "ReleaseAuditEvent_userId_occurredAt_idx" ON "ReleaseAuditEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReleaseAuditEvent_userId_trustedContactId_occurredAt_idx" ON "ReleaseAuditEvent"("userId", "trustedContactId", "occurredAt");

-- CreateIndex
CREATE INDEX "EmailRetryQueue_status_nextAttemptAt_idx" ON "EmailRetryQueue"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EmailRetryQueue_userId_idx" ON "EmailRetryQueue"("userId");
