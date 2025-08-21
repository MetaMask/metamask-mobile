# Perps Deeplinks Testing Guide

## Overview

This document provides testing instructions for the new Perps deeplinks implementation (TAT-1344).

## Deeplink URLs

### 1. Perps Market Details (Priority #1)

- **Production URL**: `https://link.metamask.io/perps`
- **Alternative URL**: `https://link.metamask.io/perps-markets`
- **Test URL**: `https://link-test.metamask.io/perps`

### 2. Specific Perps Asset

- **Production URL**: `https://link.metamask.io/perps-asset?symbol=BTC`
- **Test URL**: `https://link-test.metamask.io/perps-asset?symbol=BTC`
- **Available symbols**: BTC, ETH, SOL, etc.

## Testing Scenarios

### Mobile App Testing

#### Scenario 1: First-Time User

1. Clear app data or use a fresh installation
2. Click on perps deeplink: `https://link.metamask.io/perps`
3. **Expected**: Should navigate to Perps Tutorial screen
4. Complete or skip the tutorial
5. **Expected**: Should navigate to Wallet home with Perps tab selected

#### Scenario 2: Returning User

1. Complete the tutorial once
2. Click on perps deeplink: `https://link.metamask.io/perps`
3. **Expected**: Should navigate to Wallet home with Perps tab selected

#### Scenario 3: Specific Asset (BTC)

1. Click on asset deeplink: `https://link.metamask.io/perps-asset?symbol=BTC`
2. **Expected**: Should navigate directly to BTC market details screen

#### Scenario 4: Specific Asset (ETH)

1. Click on asset deeplink: `https://link.metamask.io/perps-asset?symbol=ETH`
2. **Expected**: Should navigate directly to ETH market details screen

#### Scenario 5: Invalid Asset

1. Click on invalid asset: `https://link.metamask.io/perps-asset?symbol=INVALID`
2. **Expected**: Should fallback to Perps Markets list

#### Scenario 6: No Symbol Parameter

1. Click on: `https://link.metamask.io/perps-asset`
2. **Expected**: Should fallback to Perps Markets list

### Desktop/Browser Extension Testing

#### Scenario 1: Extension Installed

1. Click any perps deeplink on desktop with MetaMask extension installed
2. **Expected**: Should redirect to `https://metamask.io/perps` page

#### Scenario 2: Extension Not Installed

1. Click any perps deeplink on desktop without MetaMask extension
2. **Expected**: Should redirect to MetaMask download page

## Testing Commands

### iOS Testing

```bash
# Open deeplink in iOS Simulator
xcrun simctl openurl booted "https://link.metamask.io/perps"
xcrun simctl openurl booted "https://link.metamask.io/perps-asset?symbol=BTC"
```

### Android Testing

```bash
# Open deeplink in Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps"
adb shell am start -W -a android.intent.action.VIEW -d "https://link.metamask.io/perps-asset?symbol=BTC"
```

### Local Testing (Development)

```bash
# For development builds, use test URLs
xcrun simctl openurl booted "https://link-test.metamask.io/perps"
xcrun simctl openurl booted "https://link-test.metamask.io/perps-asset?symbol=ETH"
```

## Acceptance Criteria Verification

### Priority #1: Perps Market Details

- [x] First-time users see education screens
- [x] Returning users go to Perpetuals tab
- [x] Fallback to markets list on error
- [x] Works with various URL formats

### Priority #2: Specific Asset

- [x] Opens correct perp asset detail page
- [x] Supports multiple asset symbols
- [x] Falls back to markets list for invalid assets
- [x] Handles missing parameters gracefully

## Implementation Files

- `/app/constants/deeplinks.ts` - Added PERPS actions
- `/app/core/DeeplinkManager/Handlers/handlePerpsUrl.ts` - Main handler logic
- `/app/core/DeeplinkManager/ParseManager/handleUniversalLink.ts` - Action routing
- `/app/core/DeeplinkManager/DeeplinkManager.ts` - Manager methods
- `/app/components/Views/Wallet/index.tsx` - Added defaultTab support for tab selection
- `/app/components/UI/Perps/components/PerpsTutorialCarousel/PerpsTutorialCarousel.tsx` - Updated navigation for deeplink flow

## Notes

- The implementation checks `Engine.context.PerpsController?.state.isFirstTimeUser` to determine tutorial status
- Markets are fetched dynamically using `Engine.context.PerpsController?.getMarketDataWithPrices()`
- All deeplinks show the standard deeplink interstitial (public/private/invalid) before navigation
- Tutorial receives `isFromDeeplink` parameter to ensure proper navigation after completion
- When tutorial is opened via deeplink and user clicks "Got it", they are navigated to wallet home with Perps tab selected
- Wallet component now accepts `defaultTab` route param to automatically select the correct tab
- Tab index is calculated dynamically based on which features are enabled (perps, defi, collectibles)
- Debug logging uses DevLogger for production-safe logging
