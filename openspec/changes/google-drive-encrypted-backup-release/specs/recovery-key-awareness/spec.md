## ADDED Requirements

### Requirement: Owners are warned to share the recovery key separately
The system SHALL explicitly tell owners that trusted contacts cannot open the encrypted backup without the recovery key and that the key must be shared separately in advance.

#### Scenario: Trusted contact setup warning
- **WHEN** a user adds or manages trusted contacts
- **THEN** the system displays a warning that the recovery key must be shared separately
- **AND** explains that release email and optional phone fields are stored separately from the encrypted vault for emergency delivery

#### Scenario: Deadman setup warning
- **WHEN** a user arms or reviews the deadman switch flow
- **THEN** the system reminds the user that the system will never send the recovery key automatically

#### Scenario: Retrieval instructions mention recovery key requirement
- **WHEN** a trusted contact opens the retrieval page
- **THEN** the page states that the encrypted backup cannot be opened without the owner's separately shared recovery key
