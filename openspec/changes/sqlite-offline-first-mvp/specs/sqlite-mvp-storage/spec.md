## ADDED Requirements

### Requirement: MVP backend persistence uses SQLite
The system SHALL use SQLite as the backend persistence layer for MVP user records, sessions, consent state, derived metrics, and encrypted sync blobs.

#### Scenario: Local development setup
- **WHEN** a developer sets up the MVP application
- **THEN** the database configuration uses SQLite without requiring PostgreSQL infrastructure

#### Scenario: Sync-related persistence
- **WHEN** an authenticated user enables cloud sync
- **THEN** sync-related backend records SHALL be stored in SQLite-backed Prisma models

### Requirement: Backend persistence remains operationally minimal
The system SHALL limit backend persistence to the records required for authentication, consent tracking, derived metrics, and encrypted sync payloads.

#### Scenario: Backend record scope
- **WHEN** the application writes data to the backend
- **THEN** the write SHALL target only user/account/session records, consent state, derived metrics, or encrypted sync blobs

