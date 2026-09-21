# Perps Outreach Contact Configuration Design

## Goal

Move the Perps outreach bottom sheet contact configuration from static mobile
constants into the Terminal outreach campaign response. Also restore the two
bottom-sheet actions to one horizontal row without button icons.

## Terminal Backend

The campaign configuration and eligible banner response gain a required,
nested `contact` object:

```typescript
interface OutreachContact {
  email: string;
  telegramUsername: string;
  calendlyUrl: string;
}
```

The campaign schema requires each value to be a non-empty string. The outreach
service copies the object into `banner.contact` without localization because
these values are campaign configuration rather than user-facing copy.

The active campaign uses:

- `email`: `matthieu.saintolive@consensys.net`
- `telegramUsername`: `@msainto`
- `calendlyUrl`: `https://calendly.com/matthieu-saintolive/30min`

Schema, service, and HTTP integration tests cover validation and response
serialization. The backend change is developed from current `main` and
submitted as a new pull request.

## Mobile

`PerpsOutreachBanner` gains the same nested contact type. The Superstruct
response schema accepts missing contact data as `null` for compatibility while
Terminal is rolling out, but there is no static mobile fallback.

`PerpsOutreachDetailsView` reads the campaign through the existing
`usePerpsOutreachBanner` React Query hook. Normally the banner fetch has already
populated this query, so opening the sheet uses cached data. A direct deeplink
can trigger the same query with the current profile or selected address.

When contact data is available:

- The displayed contact line uses `telegramUsername` and `email`.
- Telegram opens `https://t.me/<username-without-leading-@>` externally.
- Email opens through `mailto:`.
- The schedule action opens `calendlyUrl` in the in-app browser.

When contact data is absent, contact-dependent content and actions are not
rendered. This avoids silently using stale hardcoded campaign data.

The footer switches to horizontal alignment and removes both `startIconName`
properties. Existing button labels remain unchanged.

## Testing

Changes follow test-first development:

1. Backend schema tests fail until contact is required and validated.
2. Backend service and integration tests fail until contact is returned.
3. Mobile API tests fail until contact is parsed and missing contact defaults
   to `null`.
4. Bottom-sheet tests fail until backend contact data drives text and actions.
5. A footer test verifies horizontal buttons without icon props.

Targeted unit tests, type checking, and linting verify both repositories.

## Rollout and Failure Behavior

Terminal should deploy before the mobile version that consumes contact data.
The compatibility parser prevents an older Terminal deployment from hiding the
banner due to schema validation, while the bottom sheet avoids presenting
actions with unknown destinations.
