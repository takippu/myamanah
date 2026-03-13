## ADDED Requirements

### Requirement: Sensitive vault content is encrypted outside active client runtime
The system SHALL encrypt sensitive vault content before storing it in local persistence or cloud sync payloads.

#### Scenario: Sensitive local persistence
- **WHEN** a user saves assets, debts, wishes, digital legacy entries, trusted contacts, or sensitive notes
- **THEN** the persisted local representation SHALL contain only encrypted vault payload data and not plaintext sensitive fields

#### Scenario: Sensitive cloud sync persistence
- **WHEN** cloud sync is enabled and sensitive vault content is uploaded
- **THEN** the backend SHALL store only the encrypted payload and decryption metadata, not plaintext sensitive content

### Requirement: Non-sensitive backend records remain unencrypted
The system SHALL keep user/account/session metadata, consent state, and derived readiness/checklist metrics unencrypted unless they contain classified sensitive content.

#### Scenario: User record storage
- **WHEN** the system persists authenticated user records for sync
- **THEN** user identity metadata SHALL remain queryable in normal backend tables without vault-content encryption

#### Scenario: Metrics storage
- **WHEN** the client reports readiness or checklist progress
- **THEN** the backend SHALL store only allowed derived values and SHALL reject payloads containing sensitive vault fields
