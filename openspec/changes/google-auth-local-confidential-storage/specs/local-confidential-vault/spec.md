## ADDED Requirements
### Requirement: Confidential Vault Data Is Local-First
The system SHALL store confidential vault content locally by default and SHALL not persist it to backend unless backup consent is enabled.

#### Scenario: User saves vault content in default mode
- **WHEN** user creates or updates assets/debts/wishes/digital legacy
- **THEN** content is encrypted client-side
- **AND** encrypted content is saved to local storage adapter
- **AND** no confidential content is sent to backend

### Requirement: Client-Side Encryption At Rest
The system SHALL encrypt vault content before local persistence.

#### Scenario: Persisting vault locally
- **WHEN** vault data is persisted
- **THEN** plaintext is transformed into encrypted payload
- **AND** persisted local value contains no readable confidential fields

### Requirement: Local Vault Must Be Recoverable Within Session Rules
The system SHALL allow user to decrypt and load local vault using user-held secrets/session context.

#### Scenario: User returns with local encrypted vault available
- **WHEN** user has valid auth session and required local secrets are present
- **THEN** app decrypts vault locally and renders vault pages
