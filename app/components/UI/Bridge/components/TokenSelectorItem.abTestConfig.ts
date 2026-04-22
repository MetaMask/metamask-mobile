import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

export const TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY =
  'swapsSWAPS4242AbtestTokenSelectorBalanceLayout';

export enum TokenSelectorBalanceLayoutVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface TokenSelectorBalanceLayoutConfig {
  showTokenBalanceFirst: boolean;
  removeTickerFromTokenBalance: boolean;
}

export const TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS: Record<
  TokenSelectorBalanceLayoutVariant,
  TokenSelectorBalanceLayoutConfig
> = {
  [TokenSelectorBalanceLayoutVariant.Control]: {
    showTokenBalanceFirst: false,
    removeTickerFromTokenBalance: false,
  },
  [TokenSelectorBalanceLayoutVariant.Treatment]: {
    showTokenBalanceFirst: true,
    removeTickerFromTokenBalance: true,
  },
};

export const TOKEN_SELECTOR_BALANCE_LAYOUT_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY,
    validVariants: Object.values(TokenSelectorBalanceLayoutVariant),
    eventNames: [EVENT_NAME.SWAP_PAGE_VIEWED],
  };
