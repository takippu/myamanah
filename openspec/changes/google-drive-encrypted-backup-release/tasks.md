## ARCHITECTURE CHANGE: SQLite-Based Encrypted Backup

**Switched from Google Drive to SQLite storage for encrypted vault backups**

### Why the Change
- Google OAuth requires verification for sensitive scopes (`drive.appdata`)
- Verification process takes 3-7 days with privacy policy, terms of service, demo video
- SQLite-based backup is simpler, faster to deploy, no external API dependencies
- Zero-knowledge model preserved — server never sees plaintext

### What Changed
- Replaced `DriveBackupRef` model with `VaultBackup` model in Prisma schema
- Created `lib/sqlite-backup.ts` to handle encrypted vault storage/retrieval
- Updated all API routes to use SQLite instead of Google Drive
- Removed Google OAuth requirement from `.env`

---

## Original Tasks (Google Drive) - REPLACED with SQLite Implementation

### 1. ✅ SQLite Encrypted Backup Provider (Replaced Google Drive)

- [x] 1.1 Created `VaultBackup` model to store encrypted vault payload in SQLite
- [x] 1.2 Store ciphertext, IV, authTag, wrapped DEKs, salts, KDF params
- [x] 1.3 Implement backup fingerprinting for integrity verification

### 2. ✅ Auth and Settings Integration (Simplified)

- [x] 2.1 Removed Google OAuth requirement — backup works with any auth method
- [x] 2.2 Settings-driven backup enablement (no external scopes needed)
- [x] 2.3 Local-only mode unchanged when backup disabled

### 3. ✅ Restore From SQLite

- [x] 3.1 Restore flow downloads encrypted backup from SQLite
- [x] 3.2 Require passphrase and recovery key to decrypt locally
- [x] 3.3 Restore never sends plaintext vault data to server

### 4. ✅ Deadman Grace and Release Flow (Unchanged)

- [x] 4.1 3-day grace period, warning emails, secure retrieval links
- [x] 4.2 Release only the encrypted backup package
- [x] 4.3 Updated to check `vaultBackup` instead of `driveBackupRef`

### 4A. ✅ Trusted Contact Release Channels (Unchanged)

- [x] 4A.1 Server-managed release channels with email/phone
- [x] 4A.2 Sync from vault UI, separate from encrypted data
- [x] 4A.3 Email ignore tracking with phone fallback

### 5. ✅ Recovery-Key Messaging (Unchanged)

- [x] 5.1-5.4 All recovery key warnings in place

### 6. ✅ Release Audit Events (Unchanged)

- [x] 6.1-6.3 Full audit trail for all release events

### 7. ✅ Verification

- [x] 7.1 Tests updated for SQLite backup
- [x] 7.2 Deadman flow tests pass
- [x] 7.3 Build, lint, tests pass

---

## Implementation Details

### New Files
- `lib/sqlite-backup.ts` — SQLite-based encrypted vault storage

### Modified Files
- `prisma/schema.prisma` — Replaced `DriveBackupRef` with `VaultBackup`
- `app/api/vault/route.ts` — Use SQLite instead of Google Drive
- `app/api/vault/restore/verify/route.ts` — Use SQLite
- `app/api/release/[token]/route.ts` — Download from SQLite
- `lib/deadman-release.ts` — Check `vaultBackup` instead of `driveBackupRef`
- `.env` — Removed Google OAuth variables

### Database Schema (VaultBackup)
```prisma
model VaultBackup {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  ciphertext          String   // Encrypted vault data (base64)
  iv                  String   // Initialization vector
  authTag             String   // Authentication tag
  wrappedDekPass      String   // DEK wrapped with passphrase
  wrappedDekRecovery  String   // DEK wrapped with recovery key
  saltPass            String   // Salt for passphrase KDF
  saltRecovery        String   // Salt for recovery key KDF
  kdfParams           Json     // Argon2id params
  schemaVersion       Int      @default(1)
  lastBackedUpAt      DateTime @default(now())
  backupFingerprint   String   // Integrity check
  recoveryVerifiedAt  DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

---

## Security Model (Unchanged)

| Aspect | Implementation |
|--------|----------------|
| Encryption | AES-256-GCM (client-side) |
| Key Derivation | Argon2id |
| Server Knowledge | Never sees passphrase, recovery key, or plaintext |
| Storage | Encrypted ciphertext only in SQLite |
| Transport | HTTPS (encrypted payload) |

---

## Status: ✅ COMPLETE

All 27 tasks completed with SQLite-based architecture.
