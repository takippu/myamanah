## 1. SQLite MVP Storage

- [x] 1.1 Change Prisma datasource and schema configuration from PostgreSQL to SQLite.
- [x] 1.2 Update environment examples, Prisma generation flow, and local setup docs for SQLite-based MVP usage.
- [x] 1.3 Verify auth, consent, metrics, and encrypted vault sync models remain compatible under SQLite.

## 2. Offline-First Vault Access

- [x] 2.1 Remove login-first middleware gating from local vault pages and allow `/access`, dashboard, vault, checklist, settings, and CRUD pages to load without authentication.
- [x] 2.2 Refactor first-run flow so access setup and local encrypted vault initialization work with no backend dependency.
- [x] 2.3 Verify all core CRUD pages read and write only the local encrypted vault when sync is disabled.

## 3. Settings-Driven Cloud Sync

- [x] 3.1 Refactor Settings so cloud sync is disabled by default and presented as an explicit opt-in control.
- [x] 3.2 Require authentication only when the user enables sync from Settings.
- [x] 3.3 Keep encrypted upload, download, and disable/delete sync flows behind authenticated sync APIs only.

## 4. Sensitive Data Boundary Enforcement

- [x] 4.1 Define the sensitive-field classification in shared code and align local/cloud persistence behavior to it.
- [x] 4.2 Ensure sensitive vault fields are only stored as encrypted payloads outside active client runtime.
- [x] 4.3 Ensure user/account/session records, consent state, and derived metrics remain unencrypted and queryable.
- [x] 4.4 Add or update validation/tests proving metrics and sync handlers reject plaintext sensitive content.

## 5. MVP Flow Cleanup

- [x] 5.1 Replace the insecure recovery key generator in the access setup flow with the crypto-safe implementation.
- [x] 5.2 Remove deprecated OTP code paths and other dead auth-related helpers not needed for MVP.
- [x] 5.3 Remove or replace dead `/restore` navigation so the MVP UI contains only working flows.

## 6. Verification

- [x] 6.1 Run the automated test suite against the offline-first SQLite configuration.
- [ ] 6.2 Verify manual or automated coverage for offline first-run, offline revisit, CRUD persistence, and Settings-driven sync enablement.
- [ ] 6.3 Verify build, lint, and OpenSpec status all pass with the completed change artifacts and implementation.
