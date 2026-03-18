## Why

The current optional cloud backup stores encrypted vault payloads behind the app backend, but the product direction now prefers Google Drive as the user-owned backup destination. The deadman switch also needs a coherent emergency-release flow that preserves the zero-knowledge model by releasing only encrypted backup data and requiring the owner to share the recovery key separately.

## What Changes

- Replace backend-stored encrypted vault blobs with Google Drive `appDataFolder` storage for opted-in backups.
- Keep local encrypted vault storage as the source of truth and use Google Drive as an optional encrypted backup target only.
- Require Google authentication only when enabling Drive backup or restoring from Drive.
- Add a deadman-switch release flow with a 3-day grace period, Resend-delivered warning/release emails, and secure retrieval links for trusted contacts after release.
- Add release audit events for warning, release, retrieval, and failure milestones.
- Store trusted-contact release channels (email required for release delivery, phone optional for manual fallback) as server-managed operational metadata and tell the user that these fields are stored separately from the encrypted vault.
- Add clear user-facing warnings that trusted contacts cannot open the backup without the separately shared recovery key.
- Add a restore flow that downloads the encrypted Drive backup and decrypts it locally with the passphrase and recovery key.

## Capabilities

### New Capabilities
- `google-drive-encrypted-backup`: Store and update the encrypted vault payload in the user's Google Drive app data area.
- `drive-auth-for-backup`: Authenticate with Google only when backup or restore requires Drive access.
- `deadman-release-package`: Release encrypted backup retrieval access to trusted contacts only after the deadman grace period completes.
- `trusted-contact-release-channels`: Persist server-readable release email and optional phone fallback details for trusted contacts.
- `recovery-key-awareness`: Warn owners that trusted contacts must receive the recovery key through a separate channel.
- `restore-from-drive`: Restore a vault from Google Drive by downloading the encrypted payload and decrypting it locally.

### Modified Capabilities
- `settings-driven-cloud-sync`: The sync destination changes from backend blob storage to Google Drive while keeping consent and Settings-based control.

## Impact

- Affected code: backup consent flow, `/api/vault` storage adapter, Google auth/scope handling, trusted contacts UI, dashboard deadman flow, restore flow, and notification/audit plumbing.
- Affected systems: local encrypted vault storage, Google OAuth, Google Drive `appDataFolder`, deadman-switch release scheduling, and audit-event persistence.
- Dependencies: Google Drive API integration, secure retrieval token model, release audit schema, Resend email delivery for grace-period warnings and contact release messages, and operational fallback handling for ignored release emails.
