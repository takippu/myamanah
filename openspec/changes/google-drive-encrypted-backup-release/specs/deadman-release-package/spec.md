## ADDED Requirements

### Requirement: Deadman release uses a grace period before trusted-contact access
The system SHALL wait 3 days after a missed deadman deadline before releasing the encrypted backup package to trusted contacts.

#### Scenario: Grace period starts after missed deadline
- **WHEN** the deadman switch deadline is missed
- **THEN** the system marks the vault as being in a grace period
- **AND** sets the release time to 3 days later unless the owner checks in

#### Scenario: Owner is warned during grace period
- **WHEN** the grace period begins
- **THEN** the system sends warning email notifications to the owner through Resend before any release occurs

#### Scenario: Release occurs after grace expires
- **WHEN** the grace period expires without a valid owner check-in
- **THEN** the system generates secure retrieval links for trusted contacts
- **AND** makes only the encrypted backup package available for retrieval

### Requirement: Trusted contacts retrieve the backup through secure links
The system SHALL expose the deadman release package through secure retrieval links instead of email attachments.

#### Scenario: Contact receives retrieval instructions
- **WHEN** a release is executed
- **THEN** the system emails each trusted contact a secure retrieval link and instructions through Resend
- **AND** SHALL NOT send the backup as a raw attachment

#### Scenario: Retrieval is auditable
- **WHEN** a trusted contact opens or completes a retrieval
- **THEN** the system records a release audit event for that access

#### Scenario: Ignored release email is detectable
- **WHEN** a retrieval link expires before the contact has viewed the page, downloaded the encrypted backup, and explicitly accepted the release instructions
- **THEN** the system marks the release email as ignored for that trusted contact
- **AND** preserves optional phone fallback metadata for manual team follow-up
