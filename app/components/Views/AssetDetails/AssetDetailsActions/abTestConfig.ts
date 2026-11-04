import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

/**
 * LaunchDarkly flag for the wallet home header action row.
 * Pattern: `{team}{TICKET}Abtest{Name}`.
 *
 * No product ticket was attached to this change. `TMCU0` is a placeholder so
 * the key matches the repo naming rule. Point the real LaunchDarkly flag at
 * this constant before the experiment is created.
 *
 * Missing, invalid, or unresolved values fall back to `control` (Buy, Swap,
 * Send, Receive). `treatment` renders Buy, Sell, Send, Receive.
 */
export const WALLET_HOME_HEADER_ACTIONS_AB_KEY =
  'homeTMCU0AbtestHeaderActionsBuySell';

export enum WalletHomeHeaderActionsVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface WalletHomeHeaderActionsVariantConfig {
  /** When true, the header row is Buy, Sell, Send, Receive. */
  showBuySellSendReceive: boolean;
}

export const WALLET_HOME_HEADER_ACTIONS_VARIANTS: Record<
  WalletHomeHeaderActionsVariant,
  WalletHomeHeaderActionsVariantConfig
> = {
  [WalletHomeHeaderActionsVariant.Control]: {
    showBuySellSendReceive: false,
  },
  [WalletHomeHeaderActionsVariant.Treatment]: {
    showBuySellSendReceive: true,
  },
};

export const WALLET_HOME_HEADER_ACTIONS_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Wallet home header actions Buy Sell',
  variationNames: {
    control: 'Buy, Swap, Send, Receive',
    treatment: 'Buy, Sell, Send, Receive',
  },
} as const;

export const WALLET_HOME_HEADER_ACTIONS_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: WALLET_HOME_HEADER_ACTIONS_AB_KEY,
    validVariants: Object.values(WalletHomeHeaderActionsVariant),
    eventNames: [EVENT_NAME.HOME_VIEWED, EVENT_NAME.ACTION_BUTTON_CLICKED],
  };
