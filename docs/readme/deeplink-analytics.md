# Deep Link Analytics

This document describes the consolidated deep link analytics system in MetaMask Mobile, which tracks user interactions with deep links through a single `DEEP_LINK_USED` event.

## Overview

The deep link analytics system consolidates multiple analytics events into a single `DEEP_LINK_USED` event that captures all relevant information about deep link usage, including:

- Route information
- App installation status (deferred vs. regular deep links)
- Signature validation status
- Interstitial modal interactions
- UTM parameters for attribution
- Route-specific sensitive properties

## DEEP_LINK_USED Event

### Event Structure

The `DEEP_LINK_USED` event is created using `AnalyticsEventBuilder` and includes both standard properties and sensitive properties.

### Standard Properties

| Property            | Type    | Description                                                                                  |
| ------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `route`             | string  | The deep link route (e.g., "swap", "perps", "deposit")                                       |
| `was_app_installed` | boolean | `true` if app was already installed, `false` for deferred deep link (app installed via link) |
| `signature`         | string  | Signature validation status: "valid", "invalid", or "missing"                                |
| `interstitial`      | string  | Interstitial state: "accepted", "rejected", or "not shown"                                   |
| `attribution_id`    | string? | Attribution ID from URL parameters                                                           |
| `utm_source`        | string? | UTM source parameter                                                                         |
| `utm_medium`        | string? | UTM medium parameter                                                                         |
| `utm_campaign`      | string? | UTM campaign parameter                                                                       |
| `utm_term`          | string? | UTM term parameter                                                                           |
| `utm_content`       | string? | UTM content parameter                                                                        |
| `target`            | string? | Full URL for invalid routes (undefined for valid routes)                                     |

### Sensitive Properties

Sensitive properties are extracted based on the route type and include transaction-specific information that should be handled with care:

#### Common Properties (Most Routes)

- `from` - Source asset/address
- `to` - Destination asset/address
- `amount` - Transaction amount
- `asset` - Asset identifier

#### Route-Specific Properties

**SWAP Route:**

- All common properties
- `slippage` - Slippage tolerance

**PERPS Route:**

- All common properties
- `symbol` - Trading pair symbol
- `screen` - Screen identifier (markets/asset/tabs)
- `tab` - Tab identifier

**DEPOSIT Route:**

- All common properties
- `provider` - Payment provider
- `payment_method` - Payment method type
- `sub_payment_method` - Sub-payment method
- `fiat_currency` - Fiat currency code
- `fiat_quantity` - Fiat amount

**TRANSACTION Route:**

- All common properties
- `gas` - Gas limit
- `gasPrice` - Gas price

**BUY Route:**

- All common properties
- `crypto_currency` - Cryptocurrency identifier
- `crypto_amount` - Cryptocurrency amount

**HOME Route:**

- `previewToken` - Preview token identifier (only property for HOME route)

**INVALID Route:**

- No sensitive properties extracted

## Branch.io Integration

### App Installation Detection

Branch.io parameters are used to determine whether a deep link represents a deferred deep link (user installed the app via the link) or a regular deep link (app was already installed).

### Branch.io Parameters

The system fetches Branch.io parameters once at the start of `handleUniversalLink` and includes them in all analytics contexts to avoid duplicate API calls.

Key Branch.io parameters:

- `+clicked_branch_link` - `true` if user came from a Branch link
- `+is_first_session` - `true` if this is the first app session (deferred deep link)

### Detection Logic

```typescript
if (clickedBranchLink === true) {
  if (isFirstSession === true) {
    // Deferred deep link - app was installed via Branch.io
    return false; // was_app_installed = false
  }
  // Regular deep link - app was already installed
  return true; // was_app_installed = true
}
// User did not come from a Branch link (direct app launch)
return true; // was_app_installed = true
```

### Performance Considerations

- Branch.io parameters are fetched once with a 500ms timeout to prevent blocking deep link processing
- Parameters are cached in the analytics context and reused across all analytics events
- If the fetch fails or times out, `branchParams` remains `undefined` and the system defaults to assuming the app was already installed

## Interstitial States

The `interstitial` property indicates the user's interaction with the deep link security modal.

### InterstitialState Enum

| State       | Value       | Description                                                                                                                    |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ACCEPTED`  | "accepted"  | User clicked "Continue" on the interstitial modal                                                                              |
| `REJECTED`  | "rejected"  | User clicked "Back" or dismissed the interstitial modal                                                                        |
| `NOT_SHOWN` | "not shown" | Interstitial was not shown (whitelisted action, in-app source, or deferred deep link scenario)                                 |
| `SKIPPED`   | "skipped"   | User has disabled interstitials ("Don't remind me again" setting) - Note: Currently not returned by determineInterstitialState |

### State Determination Logic

1. If `interstitialAction === ACCEPTED`:
   - Return `ACCEPTED` (user action takes precedence)

2. If `interstitialAction === REJECTED`:
   - Return `REJECTED` (user action takes precedence)

3. If `interstitialShown === false`:
   - Check if `branchParams` indicates deferred deep link (`+clicked_branch_link: true` and `+is_first_session: true`)
   - Return `NOT_SHOWN` (interstitial not shown for deferred deep links or other scenarios)

4. Default:
   - Return `NOT_SHOWN` (modal shown but no action taken)

## Signature Status

The `signature` property indicates the cryptographic signature validation result for the deep link.

### SignatureStatus Enum

| Status    | Value     | Description                               |
| --------- | --------- | ----------------------------------------- |
| `VALID`   | "valid"   | Signature verified successfully           |
| `INVALID` | "invalid" | Signature present but verification failed |
| `MISSING` | "missing" | No signature parameter in URL             |

### Status Determination

1. If link has valid signature AND `sig` parameter exists:
   - `VALID`

2. If `sig` parameter exists but signature verification failed:
   - `INVALID`

3. If no `sig` parameter:
   - `MISSING`

## Deep Link Routes

Routes are extracted from the deep link action and mapped to standardized route identifiers.

### DeepLinkRoute Enum

| Route                | Value                | Actions Mapped                                                  |
| -------------------- | -------------------- | --------------------------------------------------------------- |
| `HOME`               | "home"               | `ACTIONS.HOME`                                                  |
| `SWAP`               | "swap"               | `ACTIONS.SWAP`                                                  |
| `PERPS`              | "perps"              | `ACTIONS.PERPS`, `ACTIONS.PERPS_MARKETS`, `ACTIONS.PERPS_ASSET` |
| `DEPOSIT`            | "deposit"            | `ACTIONS.DEPOSIT`                                               |
| `TRANSACTION`        | "transaction"        | `ACTIONS.SEND`                                                  |
| `BUY`                | "buy"                | `ACTIONS.BUY`, `ACTIONS.BUY_CRYPTO`                             |
| `SELL`               | "sell"               | `ACTIONS.SELL`, `ACTIONS.SELL_CRYPTO`                           |
| `CARD_HOME`          | "card-home"          | `ACTIONS.CARD_HOME`                                             |
| `CARD_ONBOARDING`    | "card-onboarding"    | `ACTIONS.CARD_ONBOARDING`                                       |
| `ENABLE_CARD_BUTTON` | "enable-card-button" | `ACTIONS.ENABLE_CARD_BUTTON`                                    |
| `INVALID`            | "invalid"            | All other actions or invalid URLs                               |

### Route Extraction

Routes are extracted using `mapSupportedActionToRoute()`, which maps supported actions to their corresponding routes. Unsupported actions or invalid URLs result in the `INVALID` route.

## Analytics Context

The `DeepLinkAnalyticsContext` interface contains all information needed to generate the analytics event:

```typescript
interface DeepLinkAnalyticsContext {
  url: string; // The deep link URL
  route: DeepLinkRoute; // Extracted route
  branchParams?: BranchParams; // Branch.io parameters (optional)
  urlParams: Partial<DeeplinkUrlParams>; // URL parameters
  signatureStatus: SignatureStatus; // Signature validation result
  interstitialShown: boolean; // Whether interstitial was shown
  interstitialDisabled: boolean; // User's interstitial preference
  interstitialAction?: InterstitialState; // User's action on interstitial
}
```

### Context Creation

Analytics contexts are created in two locations:

1. **Whitelisted Actions** (line 289 in `handleUniversalLink.ts`):
   - Created for actions that skip the interstitial modal
   - `interstitialShown: false`
   - `interstitialAction: ACCEPTED`

2. **Modal Display Path** (line 329 in `handleUniversalLink.ts`):
   - Created for actions that show the interstitial modal
   - `interstitialShown` starts as `false`, set to `true` when modal is shown
   - `interstitialAction` is set when user takes action (ACCEPTED or REJECTED)
   - This context is reused in callback handlers (lines 358, 377, 385)

## Implementation Details

### Event Creation Flow

1. **Context Creation**: `handleUniversalLink` creates `DeepLinkAnalyticsContext` with all relevant information
2. **Event Building**: `createDeepLinkUsedEventBuilder` processes the context:
   - Calls `detectAppInstallation(context.branchParams)` to determine installation status
   - Extracts sensitive properties based on route
   - Determines interstitial state
   - Builds event properties
3. **Event Tracking**: `trackDeepLinkAnalytics` asynchronously tracks the event without blocking

### Branch.io Parameter Fetching

Branch.io parameters are fetched once at the start of `handleUniversalLink`:

```typescript
let branchParams: BranchParams | undefined;
try {
  const rawParams = await Promise.race([
    branch.getLatestReferringParams(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Branch.io params fetch timeout')),
        500,
      ),
    ),
  ]);

  if (
    rawParams &&
    typeof rawParams === 'object' &&
    Object.keys(rawParams).length > 0
  ) {
    branchParams = rawParams as BranchParams;
  }
} catch (error) {
  Logger.error(
    error as Error,
    'DeepLinkManager: Error getting Branch.io params',
  );
  // branchParams remains undefined
}
```

### Avoiding Duplicate API Calls

The `detectAppInstallation` function accepts an optional `branchParams` parameter to reuse already-fetched parameters:

```typescript
export const detectAppInstallation = async (
  branchParams?: BranchParams,
): Promise<boolean> => {
  // Use provided params if available, otherwise fetch
  if (branchParams) {
    return determineAppInstallationStatus(branchParams);
  }

  try {
    const latestParams = await branch.getLatestReferringParams();
    return determineAppInstallationStatus(latestParams);
  } catch (error) {
    Logger.error(
      error as Error,
      'DeepLinkAnalytics: Error accessing Branch.io parameters',
    );
    return true; // Default to app installed
  }
};
```

## Related Documentation

- [Deeplink Handling Guide](./deeplinking.md) - Main deeplink documentation
- [Deeplink Visual Flowcharts](./deeplinking-diagrams.md) - Visual diagrams of deeplink flows

## Code References

- [handleUniversalLink.ts](../../app/core/DeeplinkManager/handlers/legacy/handleUniversalLink.ts) - Main handler that creates analytics contexts
- [deepLinkAnalytics.ts](../../app/core/DeeplinkManager/util/deeplinks/deepLinkAnalytics.ts) - Analytics utility functions
- [deepLinkAnalytics.types.ts](../../app/core/DeeplinkManager/types/deepLinkAnalytics.types.ts) - Type definitions
