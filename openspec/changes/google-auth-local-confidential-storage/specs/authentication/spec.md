## ADDED Requirements
### Requirement: Better Auth With Google-Only Provider
The system SHALL authenticate users through Better Auth and SHALL only allow Google login.

#### Scenario: Unauthenticated user accesses protected route
- **WHEN** a user without a valid Better Auth session requests a protected page
- **THEN** the app redirects to login
- **AND** login presents only a Google sign-in action

#### Scenario: User signs in successfully with Google
- **WHEN** the Google OAuth flow succeeds
- **THEN** the app creates/updates a user account linked to Google provider
- **AND** the user is redirected to dashboard/home

### Requirement: Legacy OTP Authentication Is Removed
The system SHALL deprecate OTP-based auth endpoints and SHALL not offer email OTP login in UI.

#### Scenario: Client calls legacy OTP endpoint
- **WHEN** any legacy OTP endpoint is requested
- **THEN** the endpoint returns not available/deprecated response
- **AND** no session is created through OTP path
