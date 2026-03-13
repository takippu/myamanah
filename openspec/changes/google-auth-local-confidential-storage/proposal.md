## Why
The current app uses custom OTP auth and stores encrypted vault payloads in the backend by default. The product direction now requires:
- production-grade auth using Better Auth
- Google-only login
- local-first handling of confidential user vault data
- backend storage limited to non-confidential product analytics (readiness/checklist progress, user metadata)
- optional encrypted cloud backup only with explicit user consent

This change aligns implementation with privacy-first requirements while preserving measurable product usage signals.

## What Changes
- Replace custom OTP authentication with Better Auth, configured for Google OAuth only.
- Introduce a local-first confidential vault model:
  - vault content (assets, debts, wishes, digital legacy details) is encrypted client-side and stored locally by default
  - no confidential plaintext or encrypted vault payload is sent to backend unless user opts in to cloud backup
- Add consent-managed cloud backup path:
  - when user enables backup, upload only encrypted payload + metadata required for decrypt
  - allow users to disable backup and delete cloud copy
- Add backend analytics/event model for non-confidential state:
  - user profile metadata (id, provider, timestamps)
  - readiness score snapshots
  - checklist completion state
  - optional anonymous/aggregated usage counters
- Add privacy controls UI:
  - storage mode (Local only vs Local + Encrypted cloud backup)
  - consent record and revoke action
  - data export/delete controls for backend analytics profile

## Capabilities
- `authentication`: Better Auth integration with Google as sole login provider.
- `local-confidential-vault`: Local-only encrypted vault storage and runtime handling.
- `privacy-analytics`: Backend tracking of non-confidential readiness and checklist metrics.
- `optional-encrypted-cloud-backup`: Explicit-consent encrypted backup lifecycle.

## Impact
### Product impact
- Clear privacy posture: confidential vault remains local by default.
- Lower adoption friction with Google sign-in.
- Retains business visibility via safe analytics fields.

### Technical impact
- Auth subsystem and middleware will be rewritten around Better Auth sessions.
- Vault data access paths split into local adapter + optional cloud backup adapter.
- DB schema changes needed for auth tables, consent flags, readiness snapshots, and checklist progress.

### Risks
- Migration complexity from existing auth/session model.
- Data model drift between local vault and cloud analytics snapshots.
- Need strict guardrails to prevent accidental confidential-field insertion into analytics tables.
