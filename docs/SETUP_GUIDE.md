# MyAmanah Setup Guide

This guide covers everything needed to run the current app locally and configure:

- local encrypted vault storage
- Google sign-in (for authentication only)
- encrypted backup storage in our database (SQLite)
- Resend deadman-switch emails
- trusted-contact release links
- deadman processing

## 1. Requirements

- Node.js `20+`
- npm
- Google Cloud account
- Resend account

## 2. Install Dependencies

From the project root:

```bash
npm install
```

## 3. Create Environment Variables

Create `.env` from `.env.example`.

Required values:

```env
DATABASE_URL="file:./prisma/dev.db"
BETTER_AUTH_SECRET="replace_with_long_random_secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="google_client_id"
GOOGLE_CLIENT_SECRET="google_client_secret"
RESEND_API_KEY="re_xxx"
RESEND_FROM_EMAIL="MyAmanah <noreply@example.com>"
DEADMAN_CRON_SECRET="replace_with_scheduler_secret"
```

What each one is for:

- `DATABASE_URL`: SQLite database used by Prisma and Better Auth
- `BETTER_AUTH_SECRET`: session/auth secret
- `BETTER_AUTH_URL`: backend base URL
- `NEXT_PUBLIC_BETTER_AUTH_URL`: frontend base URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth credentials
- `RESEND_API_KEY`: sends owner warning emails and trusted-contact release emails
- `RESEND_FROM_EMAIL`: sender identity used by Resend
- `DEADMAN_CRON_SECRET`: protects the deadman processor endpoint

## 4. Initialize the Database

Run:

```bash
npx prisma generate
npx prisma db push
```

This creates and syncs the SQLite schema in `prisma/dev.db`.

If Prisma fails on Windows with an `EPERM` rename/unlink error:

- stop the dev server
- close tools that may be holding Prisma engine files open
- rerun:

```bash
npx prisma generate
```

## 5. Google OAuth Setup

The app uses Better Auth with Google OAuth for authentication only. We do **not** use Google Drive for backup — encrypted backups are stored in our SQLite database.

### Create OAuth credentials

In Google Cloud:

1. Create or select a project.
2. Configure the OAuth consent screen (External for development).
3. Create OAuth credentials for a `Web application`.

### Add local URLs

Add this Authorized JavaScript origin:

```text
http://localhost:3000
```

Add this Authorized redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Then copy:

- client ID -> `GOOGLE_CLIENT_ID`
- client secret -> `GOOGLE_CLIENT_SECRET`

### Important Note

Google OAuth is used **only** for login authentication. Your encrypted vault backup is stored in our SQLite database, not in Google Drive. This means:
- No Google Drive API needed
- No `drive.appdata` scope required
- Encrypted data stays in our infrastructure, not Google's

## 6. Resend Setup

Create a Resend API key and verify the sending identity used by `RESEND_FROM_EMAIL`.

Example:

```env
RESEND_FROM_EMAIL="MyAmanah <noreply@yourdomain.com>"
```

Resend is used for:

- owner warning emails during deadman grace period
- trusted-contact secure retrieval emails after deadman release

## 7. Start the App

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## 8. First-Run Flow

### Local-only vault

1. Open `/access`
2. Create a vault
3. Save the recovery key
4. Use the app locally

Core local pages:

- `/asset-records`
- `/debt-records`
- `/digital-legacy`
- `/wishes`
- `/dashboard`
- `/vault`
- `/settings`

### Important

By default:

- vault contents stay local
- vault contents are encrypted
- cloud backup is off

## 9. Enable Encrypted Database Backup

To test encrypted backup:

1. Go to `/settings`
2. Enable encrypted backup
3. Sign in with Google (for authentication only)

Expected result:

- the app uploads only the encrypted vault payload (ciphertext)
- the encrypted data is stored in our SQLite database
- plaintext vault data is never uploaded
- we never have access to your decryption keys

What gets stored:
- `ciphertext` — encrypted vault data (base64)
- `iv` — initialization vector
- `authTag` — authentication tag
- `wrappedDekPass` — data encryption key wrapped with your passphrase
- `wrappedDekRecovery` — data encryption key wrapped with your recovery key
- `saltPass` / `saltRecovery` — salts for key derivation
- `kdfParams` — Argon2id parameters

What we **never** store:
- Your passphrase
- Your recovery key
- Plaintext vault data
- Unwrapped decryption keys

## 10. Trusted Contact Release Setup

Go to `/vault` and add a trusted contact.

Current release-channel fields:

- `Release Email`
- `Phone Number (Optional)`

Important product behavior:

- release email and optional phone are stored separately from the encrypted vault
- this is necessary so MyAmanah can send secure claim links if deadman release happens
- trusted contacts still need the recovery key from the owner separately
- MyAmanah never sends the recovery key automatically

Phone number behavior:

- optional
- intended as fallback for manual team outreach if the email path fails or is ignored after deadman release

## 11. Deadman Release Behavior

Current flow:

1. User misses deadman check-in deadline
2. System enters a `3-day grace period`
3. Owner receives warning email through Resend
4. If still not checked in, trusted contacts receive a secure retrieval link
5. The claim page allows:
   - viewing instructions
   - explicit acceptance
   - encrypted backup download

### When email is treated as ignored

Release email can be marked ignored if the retrieval window expires and any of these did not happen:

- claim page was never viewed
- encrypted backup was not downloaded
- explicit acceptance was not recorded

## 12. Deadman Processor Setup

The release processor endpoint is:

```text
POST /api/deadman/process
```

It requires:

```text
Authorization: Bearer <DEADMAN_CRON_SECRET>
```

### Local test

PowerShell:

```powershell
Invoke-WebRequest `
  -Method POST `
  -Uri http://localhost:3000/api/deadman/process `
  -Headers @{ Authorization = "Bearer YOUR_DEADMAN_CRON_SECRET" }
```

### Production recommendation

Use a scheduler or cron service to call this endpoint periodically.

At minimum, it should run often enough to:

- detect missed check-ins
- start grace periods
- send owner warnings
- release trusted-contact links after grace expiry

## 13. Secure Retrieval Flow

Trusted contacts receive a secure link like:

```text
/release/<token>
```

That page:

- shows instructions
- records view
- records acceptance
- lets the contact download the encrypted backup JSON

Important:

- the download is still encrypted
- it cannot be opened without the owner’s recovery key shared separately

## 14. Verification Checklist

Run:

```bash
npm run lint
npm test
```

Expected:

- lint passes
- tests pass

Current automated coverage includes:

- backup consent
- encrypted backup upload/download
- restore verification
- deadman grace/release transitions
- retrieval route behavior
- ignored-email rule
- sanitized audit history

## 15. Manual Test Checklist

### Local vault

1. Create vault on `/access`
2. Save recovery key
3. Add records in assets, debts, digital legacy, wishes
4. Refresh and confirm local persistence

### Google Drive backup

1. Enable backup in `/settings`
2. Sign in with Google
3. Save vault changes
4. Confirm backup path works without visible plaintext data

### Trusted contact release channel

1. Open `/vault`
2. Add trusted contact
3. Fill `Release Email`
4. Optionally fill `Phone Number`
5. Confirm the UI states these are stored separately from the encrypted vault

### Deadman processing

1. Trigger the deadman processor endpoint manually
2. Confirm warning/release behavior in logs and database state
3. Open the release page
4. Accept instructions
5. Download encrypted backup

## 16. Useful Paths

- app root: `/`
- access setup/unlock: `/access`
- dashboard: `/dashboard`
- vault/trusted contacts: `/vault`
- settings/backup: `/settings`
- secure release page: `/release/[token]`
- deadman processor endpoint: `/api/deadman/process`
- release audit endpoint: `/api/release/audit`

## 17. Troubleshooting

### Google sign-in fails

Check:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- authorized origin
- redirect URI
- OAuth consent screen config

### Backup enable works but Drive backup fails

Check:

- Google scope approval
- signed-in Google account
- Better Auth Google session/access token availability

### Deadman emails fail

Check:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- sender/domain verification in Resend

### Deadman processor returns `401`

Check:

- `DEADMAN_CRON_SECRET`
- `Authorization` header format

### Prisma issues on Windows

If Prisma engine files are locked:

1. stop the app
2. rerun:

```bash
npx prisma generate
npx prisma db push
```

## 18. Security Notes

- Local vault content remains encrypted
- Google Drive stores encrypted payload only
- Recovery key is never auto-sent
- Trusted-contact release email and optional phone are intentionally stored outside the encrypted vault for emergency delivery only
- Release audit history is sanitized for operational support use
