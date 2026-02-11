# Intercom SDK Integration

## Overview

MetaMask Mobile integrates the [Intercom React Native SDK](https://developers.intercom.com/installing-intercom/react-native/installation/) to provide two core features:

1. **Support Mode** — In-app Messenger for customer support (Settings > Get Help)
2. **Surveys Mode** — Event-triggered micro-surveys (e.g., post-trade CSAT)

The integration follows a **privacy-first** architecture: the SDK is only initialized on explicit user action, uses anonymous (unidentified) sessions, and never sends PII to Intercom.

## Architecture

```
app/core/Intercom/
├── IntercomService.ts       # Core SDK wrapper (singleton)
├── SupportService.ts        # Support Mode logic
├── SurveyService.ts         # Surveys Mode logic (consent, eligibility, cooldown)
├── config.ts                # Configuration from env vars + feature flags
├── types.ts                 # TypeScript interfaces and constants
├── index.ts                 # Public exports
└── __tests__/
    ├── IntercomService.test.ts
    ├── SupportService.test.ts
    └── SurveyService.test.ts
```

### Service Hierarchy

```
IntercomService (core SDK wrapper)
├── SupportService (uses IntercomService for Messenger)
└── SurveyService (uses IntercomService for surveys)
```

- **IntercomService** — Singleton that wraps the native Intercom SDK. Handles initialization, user session management, event listeners, and presenting content. All other services go through this.
- **SupportService** — Opens the Intercom Messenger for support conversations. Falls back to the Help Center in a browser if Intercom is unavailable.
- **SurveyService** — Manages survey consent, eligibility checks, throttling/cooldown, and bucketed metadata. Persists state to AsyncStorage.

## Privacy Design

### No PII — By Design

| What we send                        | What we NEVER send                |
| ----------------------------------- | --------------------------------- |
| App version (`7.65.0`)              | Wallet address                    |
| Platform (`iOS`/`Android`)          | Email, phone, name                |
| Locale language code (`en`)         | Device advertising ID             |
| Feature area (`perps`, `settings`)  | IP address (disabled server-side) |
| Bucketed order count (`2-4`)        | Exact transaction amounts         |
| Bucketed trade size (`500-1999`)    | App usage patterns                |
| Anonymous UUID (rotated on opt-out) | Persistent device identifiers     |

### Initialization Flow

```
User taps "Get Help" or survey triggers
       │
       ▼
Is Intercom initialized? ──No──► Initialize SDK
       │                           │
       │                    Intercom.initialize(apiKey, appId)
       │                    Intercom.loginUnidentifiedUser()
       │                    Intercom.setLauncherVisibility(GONE)
       │                           │
       ◄───────────────────────────┘
       │
       ▼
Update user with bucketed metadata
       │
       ▼
Present Messenger or Survey
```

Key points:

- SDK is **never** initialized at app startup
- Uses `loginUnidentifiedUser()` exclusively — never `loginUserWithUserAttributes()`
- The default Intercom launcher bubble is hidden; we use custom entry points

### Anonymous UUID

Each session has a random UUID (`v4`) used as the only identifier sent to Intercom. It:

- Is generated on first use and persisted to AsyncStorage
- Is **rotated** (replaced with a new one) when a user opts out of surveys
- Cannot be linked back to a wallet address or device

## Configuration

### Environment Variables

Set these in `.js.env`:

```bash
INTERCOM_IOS_API_KEY="ios_sdk-..."
INTERCOM_ANDROID_API_KEY="android_sdk-..."
INTERCOM_APP_ID="..."
```

### Expo Plugin

The Intercom SDK is configured as an Expo plugin in `app.config.js`:

```javascript
[
  '@intercom/intercom-react-native',
  {
    useManualInit: true,       // JS-side initialization (not native)
    intercomRegion: 'US',      // Data hosting region
  },
],
```

`useManualInit: true` is critical — it prevents the SDK from auto-initializing at app launch, giving us full control over when and whether the SDK loads.

### Feature Flags

Feature behavior is controlled by remote config flags (see `types.ts` > `IntercomFeatureFlags`):

| Flag                         | Default   | Description                                 |
| ---------------------------- | --------- | ------------------------------------------- |
| `surveys_enabled_mobile`     | `false`   | Enable survey functionality                 |
| `support_enabled_mobile`     | `true`    | Enable support functionality                |
| `kill_switch`                | `false`   | Emergency disable for all Intercom features |
| `min_orders_7d`              | `1`       | Minimum orders in 7 days to show survey     |
| `cooldown_days`              | `14`      | Days between survey impressions             |
| `suppress_after_action_days` | `30`      | Days to suppress after complete/dismiss     |
| `cohorts`                    | `['all']` | Eligible user cohorts                       |
| `locales`                    | `['en']`  | Supported locales for surveys               |

> **TODO**: Feature flags currently return defaults. Integrate with existing remote config system.

## Usage

### Support Mode

```typescript
import { SupportService } from '../../core/Intercom';

// Open support from any screen
await SupportService.openSupport({
  featureArea: 'settings', // or 'perps', 'swap', 'bridge', etc.
});
```

If Intercom is unavailable (not configured, kill switch, SDK error), `SupportService` automatically falls back to opening the Help Center in the system browser.

### Surveys Mode

```typescript
import { SurveyService } from '../../core/Intercom';

// Check and show survey (handles consent, eligibility, cooldown)
await SurveyService.triggerSurvey({
  surveyId: '57951400',
  ordersCompleted7d: 3,
  tradeSizeUsd: 500,
  network: 'ethereum',
});
```

`triggerSurvey` performs all checks before presenting:

1. Is Intercom configured and not kill-switched?
2. Has the user consented to surveys?
3. Does the user meet the orders threshold?
4. Is the user's locale supported?
5. Is the user in an eligible cohort?
6. Is the user outside the cooldown window?

If any check fails, the survey is silently skipped.

### Direct Survey Presentation (Testing)

```typescript
import { IntercomService } from '../../core/Intercom';

// Skip eligibility checks — for development/QA only
if (!IntercomService.isInitialized()) {
  await IntercomService.initialize();
}
await IntercomService.presentSurvey('57951400');
```

A test button is available in **Settings > Security & Privacy > In-App Surveys** section.

### Consent Management

```typescript
import { SurveyService } from '../../core/Intercom';

// Check consent
const hasConsent = await SurveyService.hasConsent();

// Set consent (also handles UUID rotation on opt-out)
await SurveyService.setConsent(true); // opt in
await SurveyService.setConsent(false); // opt out + rotate UUID
```

The consent toggle is in **Settings > Security & Privacy**, under the Analytics section.

## UI Entry Points

| Location                                           | Action                   | Service                           |
| -------------------------------------------------- | ------------------------ | --------------------------------- |
| Settings > Get Help                                | Opens Intercom Messenger | `SupportService.openSupport()`    |
| Settings > Security & Privacy > Surveys toggle     | Consent management       | `SurveyService.setConsent()`      |
| Settings > Security & Privacy > Test Survey button | Opens test survey        | `IntercomService.presentSurvey()` |
| Post-trade event (future)                          | Triggers CSAT survey     | `SurveyService.triggerSurvey()`   |

## Analytics Events

All Intercom interactions are tracked via MetaMetrics:

| Event                            | When                                |
| -------------------------------- | ----------------------------------- |
| `INTERCOM_SDK_INITIALIZED`       | SDK successfully initialized        |
| `INTERCOM_SDK_ERROR`             | SDK initialization or runtime error |
| `INTERCOM_SURVEY_VIEWED`         | Survey presented to user            |
| `INTERCOM_SURVEY_COMPLETED`      | User completes a survey             |
| `INTERCOM_SURVEY_DISMISSED`      | User dismisses a survey             |
| `INTERCOM_SURVEY_OPT_IN`         | User enables survey consent         |
| `INTERCOM_SURVEY_OPT_OUT`        | User disables survey consent        |
| `INTERCOM_SUPPORT_OPENED`        | Intercom Messenger opened           |
| `INTERCOM_SUPPORT_CLOSED`        | Intercom Messenger closed           |
| `INTERCOM_SUPPORT_FALLBACK_USED` | Help Center browser fallback used   |
| `INTERCOM_SUPPORT_ERROR`         | Support feature error               |

## Testing

Run unit tests:

```bash
yarn jest app/core/Intercom
```

Tests mock:

- `@intercom/intercom-react-native` — full SDK mock
- `@react-native-async-storage/async-storage` — storage mock
- `react-native-device-info` — version mock
- `locales/i18n` — locale mock

## Known Issues

- **Survey X button (iOS)**: The native close button on Intercom survey modals may not respond to taps. Drag-to-dismiss works as a workaround. This is a native Intercom SDK issue (v19.4.1).

## References

- [PRD](../intercom/PRD.md)
- [Intercom React Native SDK Docs](https://developers.intercom.com/installing-intercom/react-native/installation/)
- [Intercom Data Hosting Regions](https://developers.intercom.com/installing-intercom/react-native/data-hosting-region-configuration/)
