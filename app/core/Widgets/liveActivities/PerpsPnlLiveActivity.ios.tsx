import React from 'react';
import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';

import {
  createMetaMaskLiveActivity,
  type LiveActivityEnvironment,
} from '../createMetaMaskLiveActivity.ios';
import type { WithWidgetTheme } from '../types';

/**
 * Reference Live Activity: shows an open Perps position's live unrealized
 * P/L on the Lock Screen and in the Dynamic Island.
 *
 * Read this alongside `../widgets/BalanceWidget.ios.tsx` (the reference home
 * screen *widget*). The two differ in exactly one way: a widget layout
 * returns a single JSX tree, while a Live Activity layout returns a
 * `LiveActivityLayout` — an object whose keys are the presentation regions
 * iOS asks for (`banner` on the Lock Screen / Notification Center,
 * `compact*`/`minimal` for the collapsed Dynamic Island, `expanded*` for the
 * long-pressed Dynamic Island). Every other rule is identical, in
 * particular the no-closures rule below.
 *
 * The lifecycle (start/update/end) is owned by the Perps feature, not by
 * `WidgetUpdaterService` — see
 * `app/components/UI/Perps/services/PerpsLiveActivityService.ts`.
 */
export interface PerpsPnlLiveActivityProps {
  /** Market symbol, e.g. "BTC". */
  symbol: string;
  /** Pre-formatted direction + leverage, e.g. "Long · 10x". Composed (and translated) by PerpsLiveActivityService. */
  directionLabel: string;
  /**
   * Whether the position is currently up. Drives which theme color the P/L
   * is rendered in. Passed as a boolean rather than a color so the layout
   * can still pick the right *light or dark* variant of that color from
   * `theme` on an OS appearance change — see WithWidgetTheme in ../types.ts.
   */
  isProfit: boolean;
  /** e.g. "Unrealized P&L". */
  pnlLabel: string;
  /** Already-formatted, privacy-mode-aware unrealized P/L, e.g. "+$123.45". */
  pnlDisplay: string;
  /** Already-formatted, privacy-mode-aware return on equity, e.g. "+5.25%". */
  roeDisplay: string;
  /** e.g. "Entry price". */
  entryPriceLabel: string;
  /** Already-formatted entry price, e.g. "$65,000.00". */
  entryPriceDisplay: string;
  /** e.g. "Mark price". */
  markPriceLabel: string;
  /** Already-formatted live mark price, e.g. "$67,120.50". */
  markPriceDisplay: string;
}

/**
 * The `'widget'`-directive layout. Everything it needs arrives via `props` —
 * no imports, no selectors, no `strings()`, no module constants are reachable
 * from inside here at runtime (the whole function is replaced by a string
 * literal at build time and re-evaluated in a bare JavaScriptCore sandbox
 * inside the widget extension process). See docs/widgets/README.md.
 */
function PerpsPnlLiveActivityLayout(
  props: PerpsPnlLiveActivityProps & WithWidgetTheme,
  environment: LiveActivityEnvironment,
) {
  'widget';

  const {
    symbol,
    directionLabel,
    isProfit,
    pnlLabel,
    pnlDisplay,
    roeDisplay,
    entryPriceLabel,
    entryPriceDisplay,
    markPriceLabel,
    markPriceDisplay,
    theme,
  } = props;

  const activeTheme =
    environment.colorScheme === 'dark' ? theme.dark : theme.light;
  const pnlColor = isProfit
    ? activeTheme.colors.success
    : activeTheme.colors.error;

  const symbolText = (
    <Text
      modifiers={[
        foregroundStyle(activeTheme.colors.textDefault),
        font({
          size: activeTheme.typography.headingMd.size,
          weight: activeTheme.typography.headingMd.weight,
        }),
      ]}
    >
      {symbol}
    </Text>
  );

  const directionText = (
    <Text
      modifiers={[
        foregroundStyle(activeTheme.colors.textAlternative),
        font({
          size: activeTheme.typography.bodySm.size,
          weight: activeTheme.typography.bodySm.weight,
        }),
      ]}
    >
      {directionLabel}
    </Text>
  );

  const roeText = (
    <Text
      modifiers={[
        foregroundStyle(pnlColor),
        font({
          size: activeTheme.typography.bodySm.size,
          weight: activeTheme.typography.bodySm.weight,
        }),
      ]}
    >
      {roeDisplay}
    </Text>
  );

  const pnlText = (
    <Text
      modifiers={[
        foregroundStyle(pnlColor),
        font({
          size: activeTheme.typography.amountDisplay.size,
          weight: activeTheme.typography.amountDisplay.weight,
        }),
      ]}
    >
      {pnlDisplay}
    </Text>
  );

  // Entry/mark are rendered as label + value pairs rather than one
  // pre-composed string so the layout stays free of any string building.
  const priceRow = (
    <HStack spacing={activeTheme.spacing.md}>
      <HStack spacing={activeTheme.spacing.xs}>
        <Text
          modifiers={[
            foregroundStyle(activeTheme.colors.textMuted),
            font({
              size: activeTheme.typography.bodyXs.size,
              weight: activeTheme.typography.bodyXs.weight,
            }),
          ]}
        >
          {entryPriceLabel}
        </Text>
        <Text
          modifiers={[
            foregroundStyle(activeTheme.colors.textAlternative),
            font({
              size: activeTheme.typography.bodyXs.size,
              weight: activeTheme.typography.bodyXs.weight,
            }),
          ]}
        >
          {entryPriceDisplay}
        </Text>
      </HStack>
      <HStack spacing={activeTheme.spacing.xs}>
        <Text
          modifiers={[
            foregroundStyle(activeTheme.colors.textMuted),
            font({
              size: activeTheme.typography.bodyXs.size,
              weight: activeTheme.typography.bodyXs.weight,
            }),
          ]}
        >
          {markPriceLabel}
        </Text>
        <Text
          modifiers={[
            foregroundStyle(activeTheme.colors.textAlternative),
            font({
              size: activeTheme.typography.bodyXs.size,
              weight: activeTheme.typography.bodyXs.weight,
            }),
          ]}
        >
          {markPriceDisplay}
        </Text>
      </HStack>
    </HStack>
  );

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={activeTheme.spacing.sm}
        modifiers={[padding({ all: activeTheme.spacing.md })]}
      >
        <HStack spacing={activeTheme.spacing.sm}>
          {symbolText}
          {directionText}
          <Spacer />
          {roeText}
        </HStack>
        <VStack alignment="leading" spacing={activeTheme.spacing.xs}>
          <Text
            modifiers={[
              foregroundStyle(activeTheme.colors.textAlternative),
              font({
                size: activeTheme.typography.bodyXs.size,
                weight: activeTheme.typography.bodyXs.weight,
              }),
            ]}
          >
            {pnlLabel}
          </Text>
          {pnlText}
        </VStack>
        {priceRow}
      </VStack>
    ),
    compactLeading: symbolText,
    compactTrailing: (
      <Text
        modifiers={[
          foregroundStyle(pnlColor),
          font({
            size: activeTheme.typography.bodySm.size,
            weight: activeTheme.typography.bodySm.weight,
          }),
        ]}
      >
        {pnlDisplay}
      </Text>
    ),
    minimal: roeText,
    expandedLeading: (
      <VStack alignment="leading" spacing={activeTheme.spacing.xs}>
        {symbolText}
        {directionText}
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={activeTheme.spacing.xs}>
        <Text
          modifiers={[
            foregroundStyle(pnlColor),
            font({
              size: activeTheme.typography.headingMd.size,
              weight: activeTheme.typography.headingMd.weight,
            }),
          ]}
        >
          {pnlDisplay}
        </Text>
        {roeText}
      </VStack>
    ),
    expandedBottom: priceRow,
  };
}

/**
 * The Live Activity's registered name.
 *
 * Unlike a home screen widget, this needs NO matching `.swift` file and no
 * Xcode target change: `expo-widgets`' generic `WidgetLiveActivity()`
 * renderer is already in `ios/ExpoWidgetsTarget/index.swift`'s bundle, and it
 * dispatches to the right layout purely by this name (the string is written
 * into the shared App Group container by `createLiveActivity` at import time,
 * and read back by the extension via
 * `__expo_widgets_live_activity_<name>_layout`).
 */
export const PERPS_PNL_LIVE_ACTIVITY_NAME = 'PerpsPnlLiveActivity';

export const PerpsPnlLiveActivity =
  createMetaMaskLiveActivity<PerpsPnlLiveActivityProps>(
    PERPS_PNL_LIVE_ACTIVITY_NAME,
    PerpsPnlLiveActivityLayout,
  );
