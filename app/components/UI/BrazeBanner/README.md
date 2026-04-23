# BrazeBanner

Renders a Braze-managed HTML banner for a given placement ID. Visibility is driven by two sources: a warm-cache probe on mount (for returning users with a cached banner) and the `bannerCardsUpdated` event emitted by the Braze SDK when the server delivers fresh data.

## Prerequisites

`setBrazeUser()` must be called before this component is mounted. It identifies the current user with Braze and calls `requestBannersRefresh`, which causes the SDK to emit `bannerCardsUpdated` with fresh server data.

Returning users with a cached banner will see it immediately via the warm-cache probe regardless of `setBrazeUser()` timing. The skeleton-persistence risk applies only to first-time users who have no local cache — without `setBrazeUser()`, the skeleton may persist until the 5-second timeout elapses.

## Props

### `placementId`

The Braze placement ID this banner should render for. Must match the placement configured in the Braze dashboard.

| TYPE   | REQUIRED |
| :----- | :------- |
| string | Yes      |

## State machine

The banner moves through four states managed by `useBrazeBanner`:

| State       | UI                       | Transition                                                    |
| ----------- | ------------------------ | ------------------------------------------------------------- |
| `loading`   | Skeleton shown           | → `visible` when a valid banner arrives; → `empty` on timeout |
| `visible`   | WebView + dismiss button | → `dismissed` when user taps the close button                 |
| `empty`     | Nothing rendered         | Terminal                                                      |
| `dismissed` | Nothing rendered         | Terminal for the session                                      |

### Why a banner transitions to `empty`

- No banner for this placement arrived within 5 seconds (timeout)
- SDK returned an empty-HTML banner
- Banner is a control-group assignment (`isControl === true`)
- HTML payload exceeds 256 KB
- Banner's `dismiss_id` matches the one persisted from a previous session

## Dismiss behaviour

Tapping the close button always hides the banner immediately for the current session (in-memory). Cross-session persistence is opt-in per campaign:

- **Without `dismiss_id`** — dismissal is session-only; the banner may reappear after the app restarts.
- **With `dismiss_id`** — the ID is persisted to the Redux store and checked on future mounts; the banner stays hidden until a new campaign with a different `dismiss_id` is deployed. A custom user attribute (`banner-dismissed-<dismiss_id>`) is also set on the Braze profile, allowing the campaign to exclude this user from future targeting.

## Impression and click logging

- `Braze.logBannerImpression` is called automatically when the banner enters the `visible` state.
- `Braze.logBannerClick` is called when the user taps the banner surface (not the close button).

## Deduplication

The Braze SDK may fire multiple `bannerCardsUpdated` events for a single server update. `useBrazeBanner` deduplicates via the banner's `trackingId` — state only updates when a genuinely new banner arrives.

## Usage

```tsx
import BrazeBanner from 'app/components/UI/BrazeBanner';
import { BRAZE_BANNER_PLACEMENT_ID } from 'app/core/Braze/constants';

<BrazeBanner placementId={BRAZE_BANNER_PLACEMENT_ID} />;
```

## Campaign authoring guidelines

### Campaign properties

Set these properties on the Braze campaign:

| Property     | Type   | Required | Description                                                                            |
| ------------ | ------ | -------- | -------------------------------------------------------------------------------------- |
| `deeplink`   | string | No       | URL routed through the app deeplink pipeline on tap. See deeplink allowlist below.     |
| `height`     | number | No       | Banner height in logical pixels. Clamped to 60–240 px; defaults to 120 px when absent. |
| `dismiss_id` | string | No       | Stable identifier for cross-session dismissal. Omit for session-only banners.          |

### Interaction model — single CTA per banner

The entire banner surface is a single tap target that routes through one deeplink. **Do not render multiple interactive-looking elements** (e.g. "Cancel" and "Approve" buttons) inside the HTML creative — they will all fire the same action when tapped, which is both confusing and a potential social-engineering vector.

### Deeplink allowlist

The `deeplink` property is validated by `isAllowedBrazeDeeplink` before routing. Allowed values:

- `metamask://…` — any MetaMask in-app route **except** the MWP connect prefix (`metamask://connect/mwp`), which is explicitly blocked to prevent wallet-pairing attacks.
- `https://` — only on MetaMask-owned universal-link hosts (e.g. `link.metamask.io` and its alternates).

All other schemes (`http:`, `javascript:`, `file:`, `data:`, `intent:`, third-party `https://`, etc.) are rejected and an error is logged. Contact the #wallet-security channel or review internal security documentation for the complete list of allowed hosts.

### Assets — inline everything

The banner is rendered in an isolated WebView with a strict Content-Security-Policy:

- Scripts are blocked (`default-src 'none'`, `javaScriptEnabled={false}`).
- External fonts, iframes, frames, objects, and form submissions are blocked.
- Images from `https://` origins are permitted; the WebView runs in incognito mode and sends no cookies or `Referer` header.
- Mixed HTTP content is blocked on Android.

Prefer inlining images as `data:` URIs to eliminate any network dependency and ensure the banner renders without external requests.

### Height

Set the `height` campaign property (integer, logical pixels) to control banner height. Values are clamped to the range **60–240 px**; the default when the property is absent is **120 px**.
