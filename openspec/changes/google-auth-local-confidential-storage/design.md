## Overview
This design shifts MyAmanah to:
1. Better Auth (Google-only)
2. local-first encrypted confidential data
3. backend-only non-confidential analytics state
4. opt-in encrypted cloud backup

## Architecture

```text
Browser
  ├─ Better Auth client (Google sign-in)
  ├─ Vault Crypto (Web Crypto + Argon2id)
  ├─ Local Vault Store (IndexedDB/localStorage adapter)
  ├─ Consent Manager
  └─ Readiness Calculator
          │
          ├─ POST /api/metrics/readiness          (non-confidential)
          ├─ POST /api/metrics/checklist-progress (non-confidential)
          └─ POST /api/vault/backup               (encrypted payload, consent required)

Backend
  ├─ Better Auth server + session handling
  ├─ Metrics API routes (validated whitelist fields)
  ├─ Backup API routes (encrypted payload only)
  └─ Postgres
      ├─ users/sessions/accounts (Better Auth)
      ├─ user_readiness_snapshots
      ├─ user_checklist_progress
      ├─ user_privacy_consent
      └─ encrypted_vault_backup (optional)
```

## Data Classification
### Confidential
- assets, debts, digital legacy records, wishes free text, contacts, notes
- encryption secrets/passphrases/recovery keys

Policy: never stored in backend by default. Only encrypted blob may be stored when user explicitly opts in.

### Non-confidential (backend-allowed)
- user id/provider metadata
- readiness percentage / completion count
- checklist booleans by category (no raw text)
- consent timestamps and backup-enabled flag

## Auth Design
- Use Better Auth with Google provider only.
- Remove OTP endpoints and session-token custom auth paths.
- Middleware validates Better Auth session.
- Protected pages require authenticated session.

### Session behavior
- server-managed secure cookies via Better Auth
- no custom `session_token` cookie logic

## Local Vault Design
- Confidential vault remains encrypted client-side.
- Default persistence target: IndexedDB (fallback localStorage if needed).
- Encryption format can reuse existing payload schema (AES-GCM + wrapped DEK) for consistency.
- Keys live only in client runtime/session storage.

## Consent-Based Backup Design
- Backup disabled by default.
- Enabling backup requires explicit user consent action.
- On enable:
  - upload encrypted payload and encryption metadata only
  - record consent version + timestamp in `user_privacy_consent`
- On disable:
  - delete encrypted backup record
  - keep local encrypted vault untouched
  - preserve analytics-only records unless user requests account deletion

## Analytics Design
- Readiness/checklist is derived in client from decrypted local vault.
- Client posts only whitelisted derived fields to backend.
- API enforces schema denylist/allowlist to block confidential field writes.

Example readiness payload:
- userId
- readinessPercent
- completedCount
- totalCount
- updatedAt

Example checklist payload:
- userId
- assetsMapped: boolean
- debtsRecorded: boolean
- digitalLegacyAdded: boolean
- wishesCompleted: boolean
- trustedContactAdded: boolean
- recoveryKeySaved: boolean
- recoveryTested: boolean

## API changes
### Remove/replace
- remove OTP auth routes
- replace auth/me integration with Better Auth session APIs

### Add
- metrics endpoints:
  - `POST /api/metrics/readiness`
  - `POST /api/metrics/checklist-progress`
- backup endpoints:
  - `PUT /api/vault/backup`
  - `GET /api/vault/backup` (restore flow)
  - `DELETE /api/vault/backup`
- consent endpoints:
  - `POST /api/privacy/consent/backup`
  - `DELETE /api/privacy/consent/backup`

## Migration strategy
1. Introduce Better Auth and parallel auth middleware.
2. Ship local vault adapter and move reads/writes to local-first.
3. Add analytics tables + endpoints.
4. Add backup consent and encrypted backup endpoints.
5. Remove OTP/session legacy code after verification.

## Security guardrails
- Strict zod schemas for metrics endpoints.
- Reject any request containing known confidential keys.
- Never log raw payload bodies for vault/metrics routes.
- CSP and secure cookie defaults through Better Auth.
- Add test fixtures to assert confidential fields cannot be persisted in metrics tables.

## Open questions
- IndexedDB vs localStorage as primary local persistence layer.
- Whether to support multi-device sync in MVP (requires backup enabled).
- Account deletion semantics for analytics retention windows.
