## ADDED Requirements

### Requirement: Google Drive stores only encrypted vault backups
The system SHALL store the opted-in remote backup as the existing encrypted vault payload JSON in the user's Google Drive `appDataFolder`.

#### Scenario: Enabling backup uploads encrypted payload
- **WHEN** a user enables backup from Settings
- **THEN** the system uploads only the encrypted vault payload JSON and related encryption metadata to Google Drive
- **AND** the system SHALL NOT upload plaintext vault content

#### Scenario: Updating backup overwrites latest Drive copy
- **WHEN** a user with Drive backup enabled saves vault changes
- **THEN** the system updates the same Drive backup file using last-write-wins semantics

#### Scenario: Disabling backup removes Drive copy
- **WHEN** a user disables backup
- **THEN** the system deletes the app-managed encrypted backup file from Google Drive
- **AND** leaves the local encrypted vault intact
