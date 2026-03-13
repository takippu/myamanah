## ADDED Requirements

### Requirement: Vault is usable offline before authentication
The system SHALL allow a user to create, unlock, and use their vault locally without requiring authentication or network connectivity.

#### Scenario: First-time offline setup
- **WHEN** a user opens the app without an authenticated session and no network connection
- **THEN** the user can access the access setup flow and create local vault secrets

#### Scenario: Offline return visit
- **WHEN** a user has an existing local encrypted vault payload and later reopens the app offline
- **THEN** the system loads the local encrypted payload and allows the user to continue using core vault features without server access

### Requirement: Core vault features persist locally
The system SHALL support create, read, update, and delete flows for assets, debts, digital legacy, wishes, checklist state, and trusted contacts using local encrypted persistence as the primary store.

#### Scenario: Local CRUD write
- **WHEN** a user saves changes to a core vault feature while offline or unauthenticated
- **THEN** the system persists the updated encrypted vault locally and reflects the latest state on refresh

#### Scenario: Local derived views
- **WHEN** local vault data changes
- **THEN** dashboard, vault summary, checklist, and settings-derived counts SHALL reflect the updated local state without requiring backend reads

