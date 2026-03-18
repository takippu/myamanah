## Context

MyAmanah already encrypts the vault locally and persists a single encrypted payload. That shape is well suited for Google Drive backup because the app does not need record-level remote storage; it only needs a user-owned place to save and later retrieve the encrypted blob. The deadman-switch release flow must build on the same payload, not invent a second export format.

The design constraint is strict: the system may release the encrypted backup package, but it must never release the recovery key automatically. Recovery remains the owner's responsibility to share separately with the trusted contact, lawyer, executor, or other offline channel.

One operational exception is required: trusted-contact release email and optional phone fallback details must be stored server-side because the backend cannot send deadman notifications from data that exists only inside the encrypted vault. Those messages are sent via Resend, and the UI must explicitly tell the owner that release-channel fields are stored separately from the encrypted vault.

## Goals / Non-Goals

**Goals:**
- Use Google Drive `appDataFolder` as the optional encrypted backup destination.
- Keep local encrypted storage as source of truth and use full-payload overwrite with last-write-wins semantics.
- Require Google auth only for backup/restore actions that need Drive access.
- Add a deadman release workflow with a 3-day grace period and user warning emails before release.
- Provide trusted contacts a secure retrieval link to the encrypted backup package after release.
- Persist audit events for release lifecycle steps.
- Make the recovery-key requirement explicit in product copy.

**Non-Goals:**
- Multi-version diff or merge conflict resolution beyond last-write-wins.
- Automatic delivery of the recovery key or any server-managed decryption of vault contents.
- Collaborative or delegated trusted-contact accounts inside the app.
- Background syncing of individual records or plaintext metadata to Drive.

## Decisions

### 1. Drive stores the existing encrypted vault payload
- Decision: Upload the same encrypted payload JSON currently used for local persistence and backend backup flows.
- Rationale: This preserves the crypto boundary and avoids inventing a second export format.
- Alternatives considered:
  - Export plaintext vault JSON. Rejected because it breaks the privacy model.
  - Store per-record encrypted files. Rejected as unnecessary complexity for MVP.

### 2. Use Google Drive `appDataFolder`
- Decision: Store the encrypted backup in the user's Drive `appDataFolder` as an app-owned hidden file.
- Rationale: It reduces accidental user tampering, keeps the main Drive uncluttered, and matches the "backup, not document management" use case.
- Alternatives considered:
  - Visible Drive folder. Rejected because users may edit or move the file.
  - App backend blob storage. Rejected because product direction is user-owned Drive storage.

### 3. Last-write-wins for multi-device backup state
- Decision: Treat the most recently uploaded encrypted payload as authoritative in Drive.
- Rationale: The app already persists the whole vault as one encrypted blob, so a document-style merge model is not justified for MVP.
- Alternatives considered:
  - Version history with manual conflict resolution. Rejected for MVP scope.
  - Device-aware merge logic. Rejected because encrypted blob merge is not practical here.

### 4. Deadman release uses secure retrieval links, not attachments
- Decision: After the 3-day grace period, trusted contacts receive a secure retrieval link to the encrypted backup package plus instructions.
- Rationale: A retrieval link is easier to audit, revoke, expire, and measure than an email attachment.
- Alternatives considered:
  - Send the JSON file as an email attachment. Rejected because it is harder to control and audit.
  - Expose the Drive file directly to contacts. Rejected because it couples recipient access to the owner's Google account surface.

### 5. Three-day grace period with owner warning emails
- Decision: When the deadman window is missed, enter a 3-day grace period and email the owner reminders before any trusted-contact release happens.
- Rationale: This reduces accidental release risk while preserving the emergency function.
- Alternatives considered:
  - Immediate release at deadline. Rejected as too aggressive.
  - Longer grace period. Rejected for MVP because it delays the emergency outcome more than necessary.

### 6. Release audit events are first-class records
- Decision: Record audit events for deadman warning sent, grace started, release executed, trusted-contact retrieval opened/completed, and release failures.
- Rationale: This flow is sensitive and needs traceability.
- Alternatives considered:
  - Log-only observability. Rejected because product support and trust need persistent history.

### 7. Recovery key is never released automatically
- Decision: The app must repeatedly tell the owner that trusted contacts need the recovery key through a separate channel, and the system must never send that key during deadman release.
- Rationale: Sending both encrypted backup and key through the same system defeats the zero-knowledge boundary.
- Alternatives considered:
  - Email the recovery key together with the release package. Rejected on security grounds.
  - Server-managed escrow of the recovery key. Rejected for MVP complexity and trust reasons.

### 8. Trusted-contact release channels are stored separately from the encrypted vault
- Decision: Store trusted-contact release email plus optional phone fallback in server-readable operational tables linked to the encrypted trusted-contact record by stable contact ID.
- Rationale: The backend needs a delivery destination for grace and release notifications, and Google Drive `appDataFolder` files cannot be shared directly with contacts.
- Alternatives considered:
  - Keep all trusted-contact details only in the encrypted vault. Rejected because the release system would have no recipient addresses at trigger time.
  - Store recovery key with the release channel. Rejected because it collapses the security boundary.

### 9. Resend is the email delivery provider for deadman notifications
- Decision: Send grace-period owner warnings and trusted-contact release emails through Resend.
- Rationale: The product already depends on email-based deadman notifications, and Resend provides the transactional delivery surface needed for retrieval-link messaging.
- Alternatives considered:
  - Application-local SMTP wiring. Rejected because it adds unnecessary delivery complexity for MVP.
  - Sending no email and relying only on manual outreach. Rejected because it undermines the automated deadman workflow.

### 10. Retrieval links use a fixed seven-day window
- Decision: Retrieval links remain valid for 7 days after release and are not invalidated by first view or first download.
- Rationale: This gives trusted contacts enough time to review instructions, accept, and download without introducing one-time-link fragility during an emergency.
- Alternatives considered:
  - One-time-use links. Rejected because a partial or interrupted retrieval could create unnecessary recovery friction.
  - Indefinite validity. Rejected because it weakens the access boundary.

## Architecture

```text
Local vault (source of truth)
    |
    | save / update
    v
Encrypted payload JSON
    |
    +--> localStorage
    |
    +--> Google Drive appDataFolder
             |
             +--> restore flow downloads blob
             |
             +--> deadman release package generates secure retrieval access
                      |
                      +--> trusted contact downloads encrypted blob
                      +--> trusted contact must already have recovery key separately
```

## Data Model Changes

Add release-oriented metadata without storing vault plaintext:

- `DriveBackupRef`
  - `userId`
  - `driveFileId`
  - `lastBackedUpAt`
  - `lastBackupHash` or payload fingerprint

- `DeadmanReleaseState`
  - `userId`
  - `status` (`armed`, `grace_period`, `released`, `cancelled`)
  - `missedAt`
  - `graceEndsAt`
  - `releasedAt`

- `ReleaseAuditEvent`
  - `userId`
  - `type`
  - `occurredAt`
  - `recipientId` nullable
  - `metadataJson`

- `ReleaseRetrievalToken`
  - `userId`
  - `trustedContactId`
  - `tokenHash`
  - `expiresAt`
  - `usedAt` nullable

- `TrustedContactReleaseChannel`
  - `userId`
  - `trustedContactId`
  - `email`
  - `phone` nullable
  - `emailIgnored`
  - `firstViewedAt` nullable
  - `downloadedAt` nullable
  - `acceptedAt` nullable

These records remain non-confidential operational metadata. The vault contents remain only in encrypted blob form.

## Flow Design

### Backup enablement
1. User enables backup in Settings.
2. App requests Google sign-in with the minimal Drive scope for app data.
3. App uploads the current encrypted payload JSON to Drive.
4. App stores only Drive reference metadata plus consent state locally/backend.

### Restore from Drive
1. User chooses restore from Drive.
2. App requires Google auth if not already present.
3. App downloads encrypted payload JSON from Drive.
4. User enters passphrase and recovery key.
5. App decrypts locally and rehydrates local vault.

### Deadman release
1. Deadman deadline is missed.
2. System marks `grace_period`, records audit event, and emails the owner.
3. During the next 3 days, the owner can still check in and cancel release.
4. If no check-in happens by `graceEndsAt`, system records release, generates secure retrieval tokens, and emails trusted contacts with instructions and retrieval links.
5. Retrieval page lets the contact download only the encrypted backup package and tells them they need the owner's recovery key separately.
6. If the retrieval link expires before the contact views the page at least once, downloads the encrypted backup, and records an explicit accept/acknowledgement, the system marks the email as ignored and preserves optional phone fallback for manual team follow-up.

## Risks / Trade-offs

- [Risk] Google Drive token handling may widen auth complexity. -> Mitigation: isolate Drive access behind a provider adapter and request only the minimal Drive scope.
- [Risk] Last-write-wins may overwrite a newer local state from another device. -> Mitigation: make timestamps visible and accept this trade-off for MVP.
- [Risk] Trusted contacts may receive the package without having the recovery key. -> Mitigation: add repeated warnings and acknowledgement copy during trusted-contact and deadman setup.
- [Risk] Storing release emails and phones server-side weakens the original “all trusted-contact data is encrypted” posture. -> Mitigation: store only release-channel fields outside the vault, tell the user explicitly, and keep all other contact context encrypted.
- [Risk] Retrieval links create a new sensitive access surface. -> Mitigation: store hashed tokens, set expirations, and audit every retrieval.
- [Risk] Email delivery failure or recipient inaction could stall emergency access. -> Mitigation: send via Resend, mark ignored emails from missing view/download/accept events, and retain optional phone fallback for manual outreach.
- [Risk] Email delivery failures during grace or release could undermine trust. -> Mitigation: persist audit/failure events and expose operational follow-up paths later.

## Migration Plan

1. Add Drive backup provider abstraction behind the current backup routes.
2. Replace backend blob persistence with Drive file create/update/read/delete flows.
3. Add Drive restore flow using the same encrypted payload schema.
4. Extend deadman state tracking with grace-period and release metadata.
5. Add retrieval token generation, secure retrieval endpoints, and audit events.
6. Add warning copy in vault, dashboard, and settings for recovery-key sharing.

Rollback strategy:
- Repoint backup provider to backend blob storage while keeping encrypted payload format unchanged.
- Keep Drive references and release audit tables additive so rollback does not break local vault usage.

## Open Questions

- Whether release emails should go to all trusted contacts at once or in a defined order.
- Whether the deadman scheduler should be implemented via cron, queue, or application startup polling in MVP.
