## Why

The current app still assumes authenticated, server-backed usage too early, which slows delivery and conflicts with the product requirement that the vault must work offline first. Moving to a SQLite-backed MVP with local-first vault usage and opt-in encrypted sync reduces infrastructure friction, shortens time-to-MVP, and aligns the implementation with the intended privacy model.

## What Changes

- **BREAKING** switch the application database from PostgreSQL to SQLite for MVP delivery.
- Make the vault usable before login so users can complete access setup and all core CRUD flows fully offline.
- Keep cloud storage disabled by default and expose sync enablement only from Settings.
- Require authentication only when the user enables cloud sync, then upload/download encrypted sync payloads tied to that user.
- Store only non-sensitive user/account metadata in plaintext database records.
- Encrypt all sensitive vault content before any persistence outside in-memory runtime, including cloud sync payloads.
- Define a clear sensitive-data boundary so only classified vault fields are encrypted and non-sensitive operational records remain queryable.
- Remove or defer non-MVP flows that slow delivery, including dead restore navigation and deprecated OTP paths.

## Capabilities

### New Capabilities
- `offline-first-vault`: Users can create, unlock, edit, and use their vault locally without authentication or network connectivity.
- `settings-driven-cloud-sync`: Users can opt into cloud sync from Settings, authenticate on demand, and sync encrypted vault data to the backend.
- `sqlite-mvp-storage`: The backend uses SQLite for MVP persistence of users, sessions, consent state, derived metrics, and encrypted sync blobs.
- `sensitive-data-encryption-boundary`: Sensitive vault fields are encrypted at rest outside the active client session, while user/account metadata remains unencrypted.

### Modified Capabilities
- None.

## Impact

- Affected code: Prisma datasource configuration, auth/session flow, middleware, settings flow, vault client, backup/sync API routes, and MVP navigation.
- Affected systems: local browser storage, Better Auth session handling, encrypted vault persistence, consent-managed sync, and metrics storage.
- Dependencies: Prisma schema and migrations must be updated for SQLite compatibility; any Postgres-specific assumptions must be removed.
