# Implementation Plan: Display Market Rules

## Problem Summary

MetaMask shows only **event-level description** (vague) instead of **market-level rules** (detailed). The data is already fetched into `PredictOutcome.description` but never displayed.

### Example

| Market | Event Description (shown) | Outcome Rules (not shown) |
|--------|---------------------------|---------------------------|
| "What price will Bitcoin hit in 2025?" | "This is a market group over whit prices Bitcoin will hit in 2025." | "This market will immediately resolve to 'Yes' if any Binance 1 minute candle for Bitcoin (BTCUSDT)..." |

---

## Solution Overview

| Option | Description |
|--------|-------------|
| **1** | Show expandable rules per outcome in `PredictMarketOutcome` component |
| **2** | Display outcome-specific rules in About tab for multi-outcome markets |
| **3** | Add prominent disclaimer with link to Polymarket |

---

## Changes Summary

| File | Change |
|------|--------|
| `locales/languages/en.json` | Add new i18n strings |
| `PredictMarketDetails.tsx` | Options 2 & 3: Update About section |
| `PredictOutcomeRules.tsx` | **NEW**: Collapsible rules component |
| `PredictOutcomeRules.test.tsx` | **NEW**: Tests for rules component |
| `PredictMarketOutcome.tsx` | Option 1: Add rules expansion |
| `PredictMarketDetails.test.tsx` | Add tests for About section changes |

---

## 1. Add i18n Strings

**File**: `locales/languages/en.json`

Add to the `predict.market_details` section:

```json
"rules": "Rules",
"rules_disclaimer": "For complete market rules and resolution details, visit Polymarket.",
"view_rules": "View full rules",
"outcome_rules": "Outcome Rules",
"show_rules": "Show rules",
"hide_rules": "Hide rules"
```

---

## 2. Create Collapsible Rules Component (Option 1)

### New File: `app/components/UI/Predict/components/PredictOutcomeRules/PredictOutcomeRules.tsx`

```tsx
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';

interface PredictOutcomeRulesProps {
  description: string;
  title?: string;
}

const PredictOutcomeRules: React.FC<PredictOutcomeRulesProps> = ({
  description,
  title,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useTheme();

  if (!description) return null;

  return (
    <Box twClassName="mt-3 border-t border-muted pt-3">
      <Pressable onPress={() => setIsExpanded(!isExpanded)}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Icon
            name={IconName.Book}
            size={IconSize.Sm}
            color={colors.primary.default}
          />
          <Text variant={TextVariant.BodySm} color={TextColor.PrimaryDefault}>
            {isExpanded
              ? strings('predict.market_details.hide_rules')
              : strings('predict.market_details.show_rules')}
          </Text>
          <Icon
            name={isExpanded ? IconName.ArrowUp : IconName.ArrowDown}
            size={IconSize.Xs}
            color={colors.primary.default}
          />
        </Box>
      </Pressable>
      {isExpanded && (
        <Box twClassName="mt-3 p-3 bg-muted rounded-lg">
          {title && (
            <Text
              variant={TextVariant.BodySmBold}
              color={TextColor.TextDefault}
              twClassName="mb-2"
            >
              {title}
            </Text>
          )}
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {description}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default PredictOutcomeRules;
```

### New File: `app/components/UI/Predict/components/PredictOutcomeRules/index.ts`

```ts
export { default } from './PredictOutcomeRules';
```

---

## 3. Update PredictMarketOutcome (Option 1)

**File**: `app/components/UI/Predict/components/PredictMarketOutcome/PredictMarketOutcome.tsx`

Add import:

```tsx
import PredictOutcomeRules from '../PredictOutcomeRules';
```

Add rules display below the button container (before closing `</View>`):

```tsx
      {!isClosed && (
        <View style={styles.buttonContainer}>
          {/* ... existing buttons ... */}
        </View>
      )}
      {outcome.description && (
        <PredictOutcomeRules description={outcome.description} />
      )}
    </View>
  );
```

---

## 4. Update About Section (Options 2 & 3)

**File**: `app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.tsx`

### 4.1 Add Polymarket Market Link Handler

Add after `handlePolymarketResolution` (around line 617):

```tsx
const handleViewMarketOnPolymarket = useCallback(() => {
  if (!market?.slug) return;
  InteractionManager.runAfterInteractions(() => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: `https://polymarket.com/event/${market.slug}`,
        title: market.title,
      },
    });
  });
}, [navigation, market?.slug, market?.title]);
```

### 4.2 Replace renderAboutSection

Replace the existing `renderAboutSection` function with:

```tsx
const renderAboutSection = () => {
  const hasMultipleOutcomes = (market?.outcomes?.length ?? 0) > 1;

  return (
    <Box twClassName="gap-6">
      {/* Market Stats */}
      <Box twClassName="gap-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <Icon
              name={IconName.Chart}
              size={IconSize.Md}
              color={colors.text.muted}
            />
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              {strings('predict.market_details.volume')}
            </Text>
          </Box>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="font-medium"
            color={TextColor.TextDefault}
          >
            ${formatVolume(market?.outcomes[0].volume || 0)}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <Icon
              name={IconName.Clock}
              size={IconSize.Md}
              color={colors.text.muted}
            />
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              {strings('predict.market_details.end_date')}
            </Text>
          </Box>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="font-medium"
            color={TextColor.TextDefault}
          >
            {market?.endDate
              ? new Date(market?.endDate).toLocaleDateString()
              : 'N/A'}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <Icon
              name={IconName.Bank}
              size={IconSize.Md}
              color={colors.text.muted}
            />
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              {strings('predict.market_details.resolution_details')}
            </Text>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Pressable onPress={handlePolymarketResolution}>
              <Text
                variant={TextVariant.BodyMd}
                twClassName="font-medium"
                color={TextColor.PrimaryDefault}
              >
                Polymarket
              </Text>
            </Pressable>
            <Icon
              name={IconName.Export}
              size={IconSize.Sm}
              color={colors.primary.default}
            />
          </Box>
        </Box>
      </Box>

      <Box twClassName="w-full border-t border-muted" />

      {/* Event Description */}
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {market?.description}
      </Text>

      {/* Option 2: Outcome Rules (multi-outcome markets only) */}
      {hasMultipleOutcomes && (
        <>
          <Box twClassName="w-full border-t border-muted" />
          <Box twClassName="gap-4">
            <Text
              variant={TextVariant.HeadingSm}
              color={TextColor.TextDefault}
            >
              {strings('predict.market_details.outcome_rules')}
            </Text>
            {market?.outcomes
              ?.filter((o) => o.description)
              .map((outcome) => (
                <Box
                  key={outcome.id}
                  twClassName="p-3 bg-muted rounded-lg gap-2"
                >
                  <Text
                    variant={TextVariant.BodyMdBold}
                    color={TextColor.TextDefault}
                  >
                    {outcome.groupItemTitle || outcome.title}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {outcome.description}
                  </Text>
                </Box>
              ))}
          </Box>
        </>
      )}

      {/* Option 3: Disclaimer with Link */}
      <Box twClassName="p-3 bg-warning-muted rounded-lg gap-2">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={colors.warning.default}
          />
          <Text variant={TextVariant.BodySmBold} color={TextColor.WarningDefault}>
            {strings('predict.market_details.rules')}
          </Text>
        </Box>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('predict.market_details.rules_disclaimer')}
        </Text>
        <Pressable onPress={handleViewMarketOnPolymarket}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Text
              variant={TextVariant.BodySm}
              twClassName="font-medium"
              color={TextColor.PrimaryDefault}
            >
              {strings('predict.market_details.view_rules')}
            </Text>
            <Icon
              name={IconName.Export}
              size={IconSize.Xs}
              color={colors.primary.default}
            />
          </Box>
        </Pressable>
      </Box>
    </Box>
  );
};
```

---

## 5. Tests

### 5.1 PredictOutcomeRules Tests

**New File**: `app/components/UI/Predict/components/PredictOutcomeRules/PredictOutcomeRules.test.tsx`

```tsx
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PredictOutcomeRules from '.';

const initialState = {
  engine: { backgroundState },
};

describe('PredictOutcomeRules', () => {
  const mockDescription = 'This market resolves to Yes if BTC hits $100k.';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when description is empty', () => {
    renderWithProvider(<PredictOutcomeRules description="" />, {
      state: initialState,
    });

    expect(screen.queryByText('predict.market_details.show_rules')).toBeNull();
  });

  it('renders collapsed state initially', () => {
    renderWithProvider(
      <PredictOutcomeRules description={mockDescription} />,
      { state: initialState },
    );

    expect(
      screen.getByText('predict.market_details.show_rules'),
    ).toBeOnTheScreen();
    expect(screen.queryByText(mockDescription)).toBeNull();
  });

  it('expands to show rules when pressed', () => {
    renderWithProvider(
      <PredictOutcomeRules description={mockDescription} />,
      { state: initialState },
    );

    fireEvent.press(screen.getByText('predict.market_details.show_rules'));

    expect(
      screen.getByText('predict.market_details.hide_rules'),
    ).toBeOnTheScreen();
    expect(screen.getByText(mockDescription)).toBeOnTheScreen();
  });

  it('collapses when pressed again', () => {
    renderWithProvider(
      <PredictOutcomeRules description={mockDescription} />,
      { state: initialState },
    );

    fireEvent.press(screen.getByText('predict.market_details.show_rules'));
    fireEvent.press(screen.getByText('predict.market_details.hide_rules'));

    expect(
      screen.getByText('predict.market_details.show_rules'),
    ).toBeOnTheScreen();
    expect(screen.queryByText(mockDescription)).toBeNull();
  });

  it('displays title when provided', () => {
    renderWithProvider(
      <PredictOutcomeRules description={mockDescription} title="BTC $100k" />,
      { state: initialState },
    );

    fireEvent.press(screen.getByText('predict.market_details.show_rules'));

    expect(screen.getByText('BTC $100k')).toBeOnTheScreen();
  });
});
```

### 5.2 PredictMarketDetails Tests

**File**: `app/components/UI/Predict/views/PredictMarketDetails/PredictMarketDetails.test.tsx`

Add new describe block:

```tsx
describe('About Tab - Rules Display', () => {
  it('displays rules disclaimer with Polymarket link', () => {
    setupPredictMarketDetailsTest();

    const aboutTab = screen.getByTestId('predict-market-details-tab-bar-tab-1');
    fireEvent.press(aboutTab);

    expect(screen.getByText('predict.market_details.rules')).toBeOnTheScreen();
    expect(
      screen.getByText('predict.market_details.rules_disclaimer'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('predict.market_details.view_rules'),
    ).toBeOnTheScreen();
  });

  it('navigates to Polymarket event page when view rules is pressed', () => {
    const { mockNavigate } = setupPredictMarketDetailsTest();

    const aboutTab = screen.getByTestId('predict-market-details-tab-bar-tab-1');
    fireEvent.press(aboutTab);

    const viewRulesButton = screen.getByText('predict.market_details.view_rules');
    act(() => {
      fireEvent.press(viewRulesButton);
    });

    const callback =
      runAfterInteractionsCallbacks[runAfterInteractionsCallbacks.length - 1];
    act(() => {
      callback?.();
    });

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: expect.stringContaining('polymarket.com/event/'),
        title: expect.any(String),
      },
    });
  });

  it('displays outcome rules for multi-outcome markets', () => {
    const multiOutcomeMarket = createMockMarket({
      description: 'Event level description',
      outcomes: [
        {
          id: 'outcome-1',
          title: 'BTC $100k',
          groupItemTitle: '↑ $100,000',
          description: 'Resolves Yes if BTC reaches $100k on Binance.',
          status: 'open',
          tokens: [
            { id: 'token-1', title: 'Yes', price: 0.65 },
            { id: 'token-2', title: 'No', price: 0.35 },
          ],
          volume: 1000000,
        },
        {
          id: 'outcome-2',
          title: 'BTC $120k',
          groupItemTitle: '↑ $120,000',
          description: 'Resolves Yes if BTC reaches $120k on Binance.',
          status: 'open',
          tokens: [
            { id: 'token-3', title: 'Yes', price: 0.25 },
            { id: 'token-4', title: 'No', price: 0.75 },
          ],
          volume: 500000,
        },
      ],
    });

    setupPredictMarketDetailsTest(multiOutcomeMarket);

    const aboutTab = screen.getByTestId('predict-market-details-tab-bar-tab-1');
    fireEvent.press(aboutTab);

    expect(
      screen.getByText('predict.market_details.outcome_rules'),
    ).toBeOnTheScreen();
    expect(screen.getByText('↑ $100,000')).toBeOnTheScreen();
    expect(
      screen.getByText('Resolves Yes if BTC reaches $100k on Binance.'),
    ).toBeOnTheScreen();
  });

  it('hides outcome rules section for single-outcome markets', () => {
    const singleOutcomeMarket = createMockMarket({
      outcomes: [
        {
          id: 'outcome-1',
          title: 'Will it happen?',
          description: 'Market rules here.',
          status: 'open',
          tokens: [
            { id: 'token-1', title: 'Yes', price: 0.5 },
            { id: 'token-2', title: 'No', price: 0.5 },
          ],
          volume: 1000000,
        },
      ],
    });

    setupPredictMarketDetailsTest(singleOutcomeMarket);

    const aboutTab = screen.getByTestId('predict-market-details-tab-bar-tab-1');
    fireEvent.press(aboutTab);

    expect(
      screen.queryByText('predict.market_details.outcome_rules'),
    ).toBeNull();
  });
});
```

---

## Summary

| Option | Implementation | Condition |
|--------|---------------|-----------|
| **1** | `PredictOutcomeRules` in each outcome | `outcome.description` exists |
| **2** | Outcome rules section in About tab | `market.outcomes.length > 1` |
| **3** | Warning banner with Polymarket link | Always shown |

### Key Simplification

Instead of comparing strings (`outcome.description !== market.description`), we use a simple check:

- **Multi-outcome markets**: Show outcome-specific rules (event description is always a summary)
- **Single-outcome markets**: Skip outcome rules section (event description = outcome rules)

This avoids string comparison edge cases and is more intuitive.

