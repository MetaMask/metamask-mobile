import React from 'react';
import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';

import { createMetaMaskWidget } from '../createMetaMaskWidget.ios';
import type { WithWidgetTheme } from '../types';

/**
 * Reference widget: shows the user's total wallet balance on the home
 * screen. Also serves as the worked example for docs/widgets/README.md and
 * the `mms-ios-widgets` agent skill — copy this file's shape (props
 * interface + layout function + `createMetaMaskWidget` registration) when
 * adding a new widget.
 */
export interface BalanceWidgetProps {
  /**
   * Already-formatted, privacy-mode-aware balance string (e.g. "$12,345.67"
   * or "••••••••" when privacy mode is on). Computed by
   * `WidgetUpdaterService`, NOT inside this file — the widget sandbox has no
   * access to `createFormatters`, Redux selectors, or the privacy-mode
   * setting. See docs/widgets/README.md.
   */
  balanceDisplay: string;
  /** e.g. "Total balance". Passed as a prop (not hardcoded) so copy changes don't require a native rebuild. */
  label: string;
}

/**
 * The actual `'widget'`-directive function. Keep this as "dumb" as possible:
 * destructure already-computed values from props and arrange them with
 * `@expo/ui/swift-ui` — no data fetching, no formatting logic, no imports
 * from anywhere other than `@expo/ui/swift-ui`(/modifiers) (those resolve to
 * globals injected by expo-widgets' own bundle, see
 * app/core/Widgets/createMetaMaskWidget.ios.ts for why nothing else works).
 */
function BalanceWidgetLayout(
  props: BalanceWidgetProps & WithWidgetTheme,
  environment: WidgetEnvironment,
) {
  'widget';

  const { balanceDisplay, label, theme } = props;
  const activeTheme =
    environment.colorScheme === 'dark' ? theme.dark : theme.light;

  return (
    <VStack
      alignment="leading"
      spacing={activeTheme.spacing.xs}
      modifiers={[
        padding({ all: activeTheme.spacing.md }),
        background(activeTheme.colors.background),
      ]}
    >
      <HStack spacing={activeTheme.spacing.xs}>
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
      </HStack>
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
    </VStack>
  );
}

/**
 * The widget's registered name. MUST exactly match:
 * - the `name` string in `ios/ExpoWidgetsTarget/BalanceWidget.swift`'s
 * `WidgetsTimelineProvider(name:)` / `StaticConfiguration(kind:)`.
 * - the `widgets[].name` entry for BalanceWidget in `app.config.js`
 * (documentation only — see the comment there).
 */
export const BALANCE_WIDGET_NAME = 'BalanceWidget';

export const BalanceWidget = createMetaMaskWidget<BalanceWidgetProps>(
  BALANCE_WIDGET_NAME,
  BalanceWidgetLayout,
);
