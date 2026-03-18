## ADDED Requirements

### Requirement: Google authentication is required only for Drive actions
The system SHALL require Google authentication only when backup or restore requires Google Drive access.

#### Scenario: Local-only usage without Google auth
- **WHEN** a user has not enabled Drive backup
- **THEN** the system SHALL allow local vault usage without requiring Google authentication

#### Scenario: Backup enablement requests Drive access
- **WHEN** a user enables Drive backup from Settings
- **THEN** the system initiates Google sign-in with the minimal scope needed for app data backup

#### Scenario: Restore requests Google auth on demand
- **WHEN** a user starts restore from Drive without an active Google session
- **THEN** the system prompts for Google authentication before downloading the encrypted backup
