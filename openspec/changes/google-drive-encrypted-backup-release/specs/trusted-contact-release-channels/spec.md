## ADDED Requirements

### Requirement: Trusted-contact release channels are stored as operational metadata
The system SHALL store a trusted contact's release email and optional phone number as server-readable operational metadata separate from the encrypted vault.

#### Scenario: Release email is stored for notification delivery
- **WHEN** a user saves trusted-contact release details
- **THEN** the system stores the release email outside the encrypted vault so deadman notifications can be delivered later
- **AND** uses that email for Resend-delivered grace and release messages

#### Scenario: Phone fallback is optional
- **WHEN** a user does not provide a phone number
- **THEN** the system still allows email-based release delivery

#### Scenario: User is told about separate storage
- **WHEN** a user enters trusted-contact release details
- **THEN** the UI explains that the release email and optional phone are stored separately from the encrypted vault to support emergency delivery
