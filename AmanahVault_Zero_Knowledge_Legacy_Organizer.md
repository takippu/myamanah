# AmanahVault -- Zero-Knowledge Digital Legacy Organizer

## Overview

AmanahVault is a privacy-first digital preparedness app for Muslims to organize:

- Wealth context (what exists, where to find it, who to contact)
- Debts (to who, by when, amount optional)
- Wishes and personal instructions

This is not a wealth tracker and not a financial balance app.

Core principle:

- We store encrypted data only.
- We do not store readable plaintext vault data.
- We do not require account balances or full account numbers.

---

## Product Direction (Agreed)

### MVP positioning

MyAmanah should be a practical place to prepare legacy information without exposing sensitive financial details.

### Navigation (MVP, 5 items)

1. Home
2. Assets
3. Debts
4. Wishes
5. Checklist

### UI mode

- Force light mode for now.
- Dark mode deferred.

---

## Problem Statement

Families often face preventable confusion after death/incapacity:

- Unknown assets and documents
- Unclear debts and obligations
- Missing instructions/wishes
- Delays due to poor organization

Users avoid preparation because it feels complex, emotional, and risky from a privacy perspective.

AmanahVault solves this with structured guidance plus strong encryption.

---

## Phase 1 (MVP) Scope

## 1) Home

- Readiness summary
- Missing-items highlights
- Last sync / backup status
- Recovery status indicator

## 2) Assets

Store only practical locator context:

- Asset type
- Institution/provider
- Where to find documents
- Who to contact
- Contact method (optional)
- Notes

Do not require balances.

## 3) Debts

Store:

- Debt type
- Creditor / institution / person
- Amount (optional)
- Due date / expected timeline
- Where docs are located
- Notes

## 4) Wishes

Structured text sections:

- Religious wishes
- Family instructions
- Distribution notes / special instructions
- Executor/trusted person notes

## 5) Checklist

Checklist aligned to MVP data readiness:

- Core assets mapped
- Debts recorded
- Wishes completed
- Trusted contacts added
- Recovery key saved
- Recovery tested

Output:

- Readiness score
- Missing action prompts

Disclaimer: Not legal advice and not a legal document generator.

---

## Data & Security Architecture (Cloud-First, No Local Persistence)

### Storage model

- Cloud-first only.
- No LocalStorage / IndexedDB as source of truth.
- App may use in-memory state during session, but persistent data is encrypted cloud backup.

### Zero-knowledge envelope encryption

1. Generate random vault data key (DEK).
2. Encrypt vault JSON with AES-256-GCM using DEK.
3. Derive `K_pass` from master passphrase using Argon2id.
4. Derive `K_recovery` from recovery key using Argon2id.
5. Wrap DEK twice:
   - `wrapped_dek_pass`
   - `wrapped_dek_recovery`
6. Store only encrypted payload + wrapped keys + KDF params/salts.

Server never stores plaintext vault content or plaintext keys.

### Credentials and recovery

- Master passphrase: user-chosen, regular unlock.
- Recovery key: high-entropy emergency key, used if passphrase is lost.

If both passphrase and recovery key are lost, data cannot be recovered.

### Recovery UX (required in MVP)

- Show and require secure save of recovery key at setup.
- Add one-time recovery drill: user proves restore works.
- Display recovery verification timestamp.

---

## API/Backend Shape (MVP)

Minimum APIs:

- `POST /vault/init`
- `GET /vault`
- `PUT /vault`
- `POST /vault/restore/verify` (or equivalent event endpoint)

Auth can be simple (email OTP / magic link) for MVP speed.

Current implementation note:

- Email OTP authentication is implemented.
- Vault ownership is now bound to authenticated user sessions.
- OTP delivery uses Resend (`RESEND_API_KEY`, `EMAIL_FROM`).

---

## Tech Stack and Deployment (Agreed)

### Application stack

- Next.js + TypeScript + Tailwind CSS
- PostgreSQL
- Prisma ORM (schema + migrations)
- Next.js Route Handlers for API endpoints
- Client-side crypto:
  - Web Crypto API (AES-256-GCM)
  - Argon2id (browser-compatible library)

### Deployment model

- Linux VPS hosting (self-managed)
- PM2 process manager for app runtime
- Nginx reverse proxy + TLS termination
- No Docker in MVP deployment path

### Mobile future-proofing (Phase 2+)

- Capacitor wrapper planned after web MVP completion
- Keep API-first architecture so web and mobile share the same backend
- Keep encryption logic in reusable TypeScript modules

---

## What We Explicitly Avoid in MVP

- Full legal will drafting
- Wealth calculations / valuation dashboards
- Complex nominee/legal workflows
- Automatic dead-man switch execution
- Multi-party key splitting
- Capacitor/mobile packaging work before web MVP is stable

---

## Phase 2 Features

Move these here after MVP validation:

1. Dead-man switch encrypted release flow
   - Inactivity timer
   - Grace check-in
   - Encrypted file release only (no key transmission)
2. Advanced trusted-contact workflow
3. Shamir Secret Sharing for recovery resilience
4. Multi-device collaboration/managed sharing controls
5. AI insights and preparedness simulations
6. Optional dark mode and theme settings
7. Legal/professional integrations

---

## Monetization Direction

### Free (MVP friendly)

- Core modules: Home, Assets, Debts, Wishes, Checklist
- Encrypted cloud vault storage
- Recovery key and restore flow

### Pro (Phase 2+)

- Dead-man switch automation
- Advanced security/recovery features (e.g., secret sharing)
- Premium guidance and deeper analytics

---

## Final Product Promise

AmanahVault is the secure place for Muslims to organize legacy-critical information:

- What exists
- Where it is
- Who to contact
- What should be done

All with zero-knowledge encryption and practical recovery safeguards.
