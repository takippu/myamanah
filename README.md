# MyAmanah (MVP)

Privacy-first legacy organizer with:
- **Local-first encrypted confidential vault data** — your data stays encrypted on your device
- **Optional encrypted backup** — encrypted vault stored in our secure database (not Google Drive)
- **Zero-knowledge encryption** — we never see your passphrase, recovery key, or plaintext data
- **Google OAuth** — used only for authentication, not for storing your data
- **Backend non-confidential progress metrics** — only readiness/checklist progress, never your vault contents

## How It Works

1. **Local Encryption**: Your vault data is encrypted on your device using AES-256-GCM with keys derived via Argon2id
2. **Optional Backup**: When enabled, the encrypted ciphertext (not plaintext) is stored in our SQLite database
3. **Zero-Knowledge**: We never store or have access to your passphrase or recovery key
4. **Deadman Switch**: If something happens to you, encrypted backups can be released to trusted contacts (who need your separately-shared recovery key to decrypt)

## Tech Stack
- Next.js App Router + TypeScript
- Prisma + SQLite (for encrypted backup storage)
- Better Auth (Google OAuth for login only)
- Client-side crypto (AES-GCM + Argon2id)

## Environment
Create `.env` from `.env.example` and set values:

```bash
DATABASE_URL="file:./prisma/dev.db"
BETTER_AUTH_SECRET="long-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
RESEND_API_KEY="..."
RESEND_FROM_EMAIL="MyAmanah <noreply@example.com>"
DEADMAN_CRON_SECRET="scheduler-secret"
```

## Setup
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open http://localhost:3000

Detailed setup: [docs/SETUP_GUIDE.md](/C:/Users/ALPHV/Documents/Projects/myamanah/docs/SETUP_GUIDE.md)

## MVP Flow
1. Open `/access` and create a local vault with a passphrase and recovery key
2. Use CRUD pages to manage your legacy data:
   - `/asset-records`
   - `/debt-records`
   - `/digital-legacy`
   - `/wishes`
3. Check reflected progress in:
   - `/dashboard`
   - `/checklist`
   - `/settings`
4. Optional: Enable encrypted backup in Settings — your encrypted vault will be stored in our database

## Privacy Model
- **Confidential vault content** is encrypted client-side and stored locally by default
- **Backend storage**: Only derived metrics (readiness/checklist progress) and encrypted vault ciphertext
- **Encrypted backup** is disabled by default — user must explicitly opt-in
- **Zero-knowledge**: We cannot decrypt your vault even if compelled — we don't have your keys
- **Deadman switch**: Encrypted backup can be released to trusted contacts, who need your separately-shared recovery key

## Security
- **Encryption**: AES-256-GCM with unique IV per encryption
- **Key Derivation**: Argon2id (memory-hard, resistant to GPU cracking)
- **Data Encryption Key (DEK)**: Wrapped separately with your passphrase and recovery key
- **Transport**: HTTPS only
- **Storage**: Encrypted ciphertext only — we never store plaintext or keys

## Notes
- Build/lint passes in current codebase
- You will see warnings if Google env vars are not set (needed for OAuth login)
- Resend API key needed for deadman switch emails
