import React from 'react';
import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';

import {
  createMetaMaskLiveActivity,
  type LiveActivityEnvironment,
} from '../createMetaMaskLiveActivity.ios';
import type { WithWidgetTheme } from '../types';

/**
 * Shows the selected account's total balance on the Lock Screen and in the
 * Dynamic Island, refreshed in place as balances stream in.
 *
 * The Redux-driven counterpart of `./PerpsPnlLiveActivity.ios.tsx`: because its
 * data is exactly what `../widgets/BalanceWidget.ios.tsx` already renders on
 * the home screen, its lifecycle is driven by `../BalanceLiveActivityService.ts`
 * off the same store subscription rather than by a feature's state machine.
 */
export interface BalanceLiveActivityProps {
  /** The selected account group's name, e.g. "Account 1". */
  accountLabel: string;
  /** e.g. "Total balance". */
  label: string;
  /**
   * Already-formatted balance string, e.g. "$12,345.67". Computed by
   * `BalanceLiveActivityService`, NOT here — the sandbox this layout runs in
   * has no access to `createFormatters` or Redux. See docs/widgets/README.md.
   */
  balanceDisplay: string;
}

/**
 * The `'widget'`-directive layout. Everything it needs arrives via `props` —
 * no imports, no selectors, no `strings()`, no module constants are reachable
 * from inside here at runtime (the whole function is replaced by a string
 * literal at build time and re-evaluated in a bare JavaScriptCore sandbox
 * inside the widget extension process). See docs/widgets/README.md.
 */
function BalanceLiveActivityLayout(
  props: BalanceLiveActivityProps & WithWidgetTheme,
  environment: LiveActivityEnvironment,
) {
  'widget';

  const { accountLabel, label, balanceDisplay, theme } = props;

  const activeTheme =
    environment.colorScheme === 'dark' ? theme.dark : theme.light;

  const labelText = (
    <Text
      modifiers={[
        foregroundStyle(activeTheme.colors.textAlternative),
        font({
          size: activeTheme.typography.bodySm.size,
          weight: activeTheme.typography.bodySm.weight,
        }),
      ]}
    >
      {label}
    </Text>
  );

  const accountText = (
    <Text
      modifiers={[
        foregroundStyle(activeTheme.colors.textMuted),
        font({
          size: activeTheme.typography.bodyXs.size,
          weight: activeTheme.typography.bodyXs.weight,
        }),
      ]}
    >
      {accountLabel}
    </Text>
  );

  const balanceText = (
    <Text
      modifiers={[
        foregroundStyle(activeTheme.colors.textDefault),
        font({
          size: activeTheme.typography.amountDisplay.size,
          weight: activeTheme.typography.amountDisplay.weight,
        }),
      ]}
    >
      {balanceDisplay}
    </Text>
  );

  const compactBalanceText = (
    <Text
      modifiers={[
        foregroundStyle(activeTheme.colors.textDefault),
        font({
          size: activeTheme.typography.bodySm.size,
          weight: activeTheme.typography.bodySm.weight,
        }),
      ]}
    >
      {balanceDisplay}
    </Text>
  );

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={activeTheme.spacing.sm}
        modifiers={[padding({ all: activeTheme.spacing.md })]}
      >
        <HStack spacing={activeTheme.spacing.sm}>
          {labelText}
          <Spacer />
          {accountText}
        </HStack>
        {balanceText}
      </VStack>
    ),
    compactLeading: accountText,
    compactTrailing: compactBalanceText,
    minimal: compactBalanceText,
    expandedLeading: (
      <VStack alignment="leading" spacing={activeTheme.spacing.xs}>
        {labelText}
        {accountText}
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={activeTheme.spacing.xs}>
        {balanceText}
      </VStack>
    ),
  };
}

/**
 * The Live Activity's registered name.
 *
 * Unlike a home screen widget, this needs NO matching `.swift` file and no
 * Xcode target change — see `./PerpsPnlLiveActivity.ios.tsx` and
 * docs/widgets/README.md#live-activities.
 */
export const BALANCE_LIVE_ACTIVITY_NAME = 'BalanceLiveActivity';

export const BalanceLiveActivity =
  createMetaMaskLiveActivity<BalanceLiveActivityProps>(
    BALANCE_LIVE_ACTIVITY_NAME,
    BalanceLiveActivityLayout,
  );
