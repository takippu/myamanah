## Context

MyAmanah already has most of the domain surface needed for MVP: access setup, encrypted vault payload generation, local vault CRUD, derived readiness metrics, and consent-gated backup routes. The remaining problem is product alignment. The current implementation still assumes authenticated usage too early, keeps Postgres as the default backend, and includes dead or deferred flows that do not help the first shippable version.

This change is cross-cutting because it affects persistence, auth boundaries, middleware, settings, and the privacy model. The app must be usable offline before login, cloud sync must remain optional and initiated from Settings, and the backend must only store user records plus explicitly allowed non-sensitive data and encrypted sync blobs.

Stakeholders are the founder/product owner, end users who need privacy-safe legacy planning, and implementation contributors who need a simple MVP path with low operational overhead.

## Goals / Non-Goals

**Goals:**
- Make the full core vault workflow usable offline without requiring login.
- Replace PostgreSQL with SQLite to reduce deployment and local setup complexity for MVP.
- Keep cloud sync disabled by default and enable it only through an explicit Settings action.
- Authenticate only when needed for sync and store only encrypted sync payloads plus minimal backend metadata.
- Define and enforce a sensitive-data boundary so storage behavior is predictable and testable.

**Non-Goals:**
- Multi-device merge resolution beyond last-write-wins encrypted payload replacement.
- Rich restore UX beyond the minimum needed to verify encrypted sync behavior.
- Fine-grained encrypted field indexing or server-side search on vault contents.
- Reintroducing OTP or alternate authentication methods for MVP.

## Decisions

### 1. Offline use comes before authentication
- Decision: Remove auth as a prerequisite for `/access`, vault CRUD pages, dashboard, checklist, and settings. Require auth only at the moment a user enables cloud sync.
- Rationale: This is the smallest change that aligns implementation with the product requirement of offline-first usage.
- Alternatives considered:
  - Keep current auth gate and use demo mode for offline behavior. Rejected because it makes the core product path depend on server access.
  - Require login at first launch but cache data locally afterward. Rejected because it still breaks first-run offline usage.

### 2. SQLite becomes the sole MVP database
- Decision: Switch Prisma datasource to SQLite for users, sessions, consent records, derived metrics, and encrypted sync blobs.
- Rationale: SQLite is sufficient for a single-instance MVP, simplifies local development, and reduces deployment friction.
- Alternatives considered:
  - Keep PostgreSQL. Rejected because it adds setup and hosting complexity that does not help MVP validation.
  - Remove backend persistence entirely. Rejected because optional sync and authenticated user linkage are still MVP requirements.

### 3. Preserve the encrypted blob sync model
- Decision: Continue using client-side encryption and sync a single encrypted vault payload, not partially decrypted records.
- Rationale: This keeps backend exposure low and avoids introducing server-side sensitive-data handling.
- Alternatives considered:
  - Encrypt per-record and sync record collections. Rejected as unnecessary complexity for MVP.
  - Store plaintext sensitive records in SQLite. Rejected because it violates the privacy model.

### 4. Sensitive data is classified at the domain boundary
- Decision: Treat assets, debts, wishes, digital legacy entries, trusted contacts, free-text notes, passphrases, and recovery keys as sensitive. Treat users, auth/session records, consent flags, and derived readiness/checklist booleans as non-sensitive.
- Rationale: The product requirement is not “encrypt everything”; it is “encrypt sensitive data and only sensitive data.”
- Alternatives considered:
  - Encrypt every backend table except sessions. Rejected because it removes operational visibility and complicates normal auth/session handling.
  - Leave classification implicit in route handlers. Rejected because it is brittle and hard to test.

### 5. Settings is the sync control plane
- Decision: The Settings page is the only place where sync can be enabled, disabled, or inspected.
- Rationale: This matches the product requirement and keeps the consent model obvious to the user.
- Alternatives considered:
  - Auto-prompt for sync after login. Rejected because it increases cognitive load and weakens local-first posture.
  - Allow backup prompts on every CRUD page. Rejected because it clutters core usage flows.

### 6. Remove or defer non-MVP paths
- Decision: Remove deprecated OTP code and either remove the dead `/restore` navigation or replace it with a minimal placeholder only if needed for verification.
- Rationale: Dead or half-complete flows slow delivery and create user-facing confusion.
- Alternatives considered:
  - Keep them for “later.” Rejected because they already leak into the UI and maintenance surface.

## Risks / Trade-offs

- [Risk] Offline-first pages may accidentally keep server-auth assumptions in shared code paths. -> Mitigation: isolate auth-required routes to sync-only APIs and remove broad middleware gating.
- [Risk] SQLite introduces concurrency and scale limits. -> Mitigation: accept this for MVP and keep the schema simple so migration back to PostgreSQL remains possible later.
- [Risk] Sensitive-data classification may drift over time. -> Mitigation: codify the classification in specs and tests, and validate sync/metrics payloads strictly.
- [Risk] Local-only users may lose access if they lose both passphrase and recovery key. -> Mitigation: keep the access setup flow explicit and require recovery-key acknowledgement.
- [Risk] Sync enablement may feel abrupt if it triggers sign-in mid-session. -> Mitigation: make Settings copy explicit that cloud sync requires account linking and is optional.

## Migration Plan

1. Change Prisma datasource and schema compatibility to SQLite.
2. Relax middleware so offline/local pages are accessible without an authenticated session.
3. Separate vault usage from sync auth, keeping sync APIs protected.
4. Refactor Settings to initiate sign-in only when sync is enabled.
5. Remove deprecated OTP paths and dead restore navigation or replace with minimal MVP-safe behavior.
6. Re-run tests and add coverage for offline-first access plus sync enablement.

Rollback strategy:
- Revert the Prisma datasource and schema changes.
- Restore previous middleware gating and login-first flow.
- Keep encrypted blob schema compatible so local payloads remain usable.

## Open Questions

- Whether the MVP should support a manual “Sync now” button in addition to sync-on-change after cloud sync is enabled.
- Whether recovery verification should remain as a backend timestamp for MVP or be deferred entirely until restore UI exists.
