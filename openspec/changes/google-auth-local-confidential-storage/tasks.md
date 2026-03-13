## 0. MVP Finish Definition (Execution Gate)
- [ ] 0.1 Confirm MVP is only complete when all gates below are true:
- [ ] 0.2 User can sign in/out with Google-only Better Auth in production-like flow.
- [x] 0.3 User can perform full CRUD for Assets, Debts, Digital Legacy, Wishes.
- [x] 0.4 CRUD changes persist and are reflected correctly after refresh/navigation.
- [x] 0.5 Dashboard, Vault, Checklist, Settings readiness/progress all reflect latest state.
- [x] 0.6 Confidential data remains local-first by default; backend stores only allowed metrics unless backup consent is enabled.

## 1. Phase 1 - Better Auth + Google-Only Authentication
- [x] 1.1 Install and configure Better Auth server/client integration for Next.js App Router.
- [x] 1.2 Configure Google provider only and remove OTP sign-in UI/action paths.
- [x] 1.3 Replace middleware/session checks to use Better Auth session validation.
- [x] 1.4 Add/align Prisma schema for Better Auth account/session/user requirements.
- [x] 1.5 Remove/deprecate legacy OTP auth endpoints and related helpers.
- [x] 1.6 Verify protected routes redirect correctly and authenticated routes render consistently.

## 2. Phase 2 - Local-First Confidential Vault Persistence
- [x] 2.1 Introduce local vault storage adapter (IndexedDB-first with documented fallback).
- [x] 2.2 Refactor vault client APIs to read/write encrypted payload locally by default.
- [x] 2.3 Ensure encryption/decryption stays client-side for confidential fields.
- [x] 2.4 Add startup/session handling so local encrypted vault reloads correctly on revisit.

## 3. Phase 3 - Full CRUD Completion Across Core Modules
- [x] 3.1 Assets: create/read/update/delete fully functional against local-first vault.
- [x] 3.2 Debts: create/read/update/delete fully functional against local-first vault.
- [x] 3.3 Digital Legacy: create/read/update/delete fully functional against local-first vault.
- [x] 3.4 Wishes: create/read/update/delete (section edits + clear/update flows) fully functional.
- [x] 3.5 Checklist and readiness calculation update immediately after CRUD changes.
- [x] 3.6 Refresh and navigation validation: latest CRUD state is reflected across all dependent pages.

## 4. Phase 4 - Privacy-Safe Backend Metrics
- [x] 4.1 Add backend schema/tables for `user_readiness_snapshots` and `user_checklist_progress`.
- [x] 4.2 Implement metrics endpoints with strict zod validation and confidential-field denylist.
- [x] 4.3 Post derived readiness/checklist state from client without confidential content.
- [x] 4.4 Add tests proving confidential fields are rejected and never written.

## 5. Phase 5 - Optional Encrypted Cloud Backup + Consent
- [x] 5.1 Add consent model (`user_privacy_consent`) and backup-enabled semantics.
- [x] 5.2 Add encrypted backup table (`encrypted_vault_backup`) and backup CRUD endpoints.
- [x] 5.3 Gate backup upload/download/delete by consent state only.
- [x] 5.4 Add settings controls: enable backup, disable backup, delete cloud copy.

## 6. Phase 6 - End-to-End Verification to MVP Finish
- [x] 6.1 Add integration/e2e coverage for Google login + all core CRUD flows.
- [x] 6.2 Verify CRUD reflection behavior after refresh/navigation across dashboard/vault/checklist/settings.
- [x] 6.3 Verify backend contains only allowed non-confidential metrics by default.
- [x] 6.4 Verify consent-gated backup behavior and revoke/delete paths.
- [x] 6.5 Verify logs/telemetry do not expose confidential payloads.
- [x] 6.6 Update docs (architecture, privacy guarantees, setup, env vars, runbook).
- [ ] 6.7 Mark MVP complete only after all gates in section 0 are checked.
