## ADDED Requirements

### Requirement: Cloud sync is opt-in from Settings
The system SHALL keep cloud sync disabled by default and SHALL expose sync enablement and disablement only from the Settings experience.

#### Scenario: Default local-only mode
- **WHEN** a user has not enabled cloud sync
- **THEN** the system operates in local-only mode and SHALL NOT upload vault payloads to the backend

#### Scenario: Settings enablement
- **WHEN** a user chooses to enable cloud sync from Settings
- **THEN** the system initiates the account-linking/authentication flow required for sync and requests explicit consent before upload

### Requirement: Synced vault payloads remain encrypted
The system SHALL upload and download only encrypted vault sync payloads and required decryption metadata for cloud sync.

#### Scenario: Sync upload
- **WHEN** cloud sync is enabled and a vault payload is saved
- **THEN** the backend receives only the encrypted vault payload and encryption metadata needed for later decryption

#### Scenario: Sync disablement
- **WHEN** a user disables cloud sync from Settings
- **THEN** the system deletes the remote encrypted sync copy and leaves the local encrypted vault intact

