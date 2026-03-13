## ADDED Requirements
### Requirement: Backend Stores Only Non-Confidential Progress Metrics
The system SHALL persist non-confidential readiness/checklist metrics for authenticated users.

#### Scenario: Client posts readiness metrics
- **WHEN** client submits readiness percentage and completion counts
- **THEN** backend validates payload against approved schema
- **AND** backend stores snapshot linked to user

#### Scenario: Client posts checklist progress
- **WHEN** client submits checklist booleans
- **THEN** backend stores only boolean/status fields
- **AND** backend stores no confidential free-text data

### Requirement: Analytics Endpoint Enforces Confidential Field Blocking
The system SHALL reject analytics writes containing confidential vault fields.

#### Scenario: Payload contains disallowed confidential key
- **WHEN** request includes fields such as wishes text, account details, notes, or vault ciphertext
- **THEN** request is rejected with validation error
- **AND** no record is written
