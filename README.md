# MyAmanah (MVP)

Privacy-first legacy organizer with:
- local-first encrypted confidential vault data
- optional Google login via Better Auth for cloud sync
- backend non-confidential progress metrics
- optional encrypted cloud backup by explicit consent

## Tech Stack
- Next.js App Router + TypeScript
- Prisma + SQLite
- Better Auth (Google OAuth)
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
```

## Setup
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open http://localhost:3000

## MVP Flow
1. Open `/access` and create a local vault, or unlock an existing vault on this device.
2. Use CRUD pages offline:
- `/asset-records`
- `/debt-records`
- `/digital-legacy`
- `/wishes`
3. Check reflected progress in:
- `/dashboard`
- `/checklist`
- `/settings`
4. If you want encrypted cloud backup, enable it in Settings and sign in with Google there.

## Privacy Model
- Confidential vault content is encrypted and stored locally by default.
- Backend stores only derived metrics (readiness/checklist progress).
- Encrypted cloud backup is disabled by default.
- User must explicitly enable backup in Settings after signing in.

## Notes
- Build/lint passes in current codebase.
- You will see warnings if Google env vars are not set.
