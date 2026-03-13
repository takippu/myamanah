## ADDED Requirements
### Requirement: Cloud Backup Requires Explicit User Consent
The system SHALL only store encrypted vault backup in backend after explicit user opt-in consent.

#### Scenario: User has not enabled backup
- **WHEN** user updates vault content
- **THEN** backend does not receive/store encrypted vault backup

#### Scenario: User enables backup
- **WHEN** user provides explicit consent for cloud backup
- **THEN** consent status and timestamp are stored
- **AND** encrypted vault backup uploads are allowed

### Requirement: Cloud Backup Stores Encrypted Data Only
The system SHALL store only encrypted vault payload and required cryptographic metadata.

#### Scenario: Backup upload is accepted
- **WHEN** client uploads vault backup
- **THEN** stored record contains encrypted payload + metadata
- **AND** stored record contains no decrypted confidential fields

### Requirement: User Can Revoke Backup Consent
The system SHALL support revoking backup consent and deleting cloud backup record.

#### Scenario: User disables backup
- **WHEN** user revokes consent
- **THEN** encrypted cloud backup is deleted
- **AND** local encrypted vault remains available
