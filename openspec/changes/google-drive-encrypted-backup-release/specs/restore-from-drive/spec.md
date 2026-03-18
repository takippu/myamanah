## ADDED Requirements

### Requirement: Vault restore downloads the encrypted Drive backup and decrypts locally
The system SHALL restore from Google Drive by downloading the encrypted backup package and decrypting it locally with user-supplied secrets.

#### Scenario: Restore downloads encrypted backup
- **WHEN** a user starts a Drive restore
- **THEN** the system downloads the encrypted backup payload JSON from Google Drive

#### Scenario: Restore requires decryption secrets
- **WHEN** the encrypted backup has been downloaded
- **THEN** the system requires the passphrase and recovery key before restoring the vault locally

#### Scenario: Restore does not expose plaintext to backend
- **WHEN** a Drive restore completes
- **THEN** vault plaintext is decrypted only on the client
- **AND** the backend SHALL NOT receive plaintext vault content during restore
