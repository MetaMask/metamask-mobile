import { IconName } from '@metamask/design-system-react-native';

export interface ProHubStats {
  /** Formatted currency string for lifetime Pro earnings. */
  lifetimeEarnings: string;
  /** Formatted currency string for Money balance earnings. */
  moneyBalance: string;
  /** Formatted currency string for mUSD back earnings. */
  musdBack: string;
}

export interface AlsoIncludedItem {
  id: string;
  iconName: IconName;
  titleKey: string;
  subtitleKey: string;
  badgeKey?: string;
}

// TODO: replace with real API data once the membership endpoint is available.
export const MOCK_PRO_HUB_STATS: ProHubStats = {
  lifetimeEarnings: '$86.42',
  moneyBalance: '+$48.92',
  musdBack: '$0.00',
};

export const ALSO_INCLUDED_ITEMS: AlsoIncludedItem[] = [
  {
    id: 'transaction_protection',
    iconName: IconName.SecurityTick,
    titleKey: 'pro_hub.also_included.transaction_protection.title',
    subtitleKey: 'pro_hub.also_included.transaction_protection.subtitle',
    badgeKey: 'pro_hub.also_included.transaction_protection.badge',
  },
  {
    id: 'priority_support',
    iconName: IconName.Call,
    titleKey: 'pro_hub.also_included.priority_support.title',
    subtitleKey: 'pro_hub.also_included.priority_support.subtitle',
  },
];

export type TradeAllowanceKind = 'currency' | 'count';

export interface TradeAllowanceItem {
  id: 'swaps' | 'perps' | 'predict';
  used: number;
  allowance: number;
  kind: TradeAllowanceKind;
  /**
   * When true, the period cap is spent even if used/allowance would otherwise
   * compute a 0% bar (missing consumed with remaining 0).
   */
  exhausted?: boolean;
}

// TODO: replace with real API data once the membership endpoint is available.
export const MOCK_TRADE_ALLOWANCES: TradeAllowanceItem[] = [
  { id: 'swaps', used: 310, allowance: 500, kind: 'currency' },
  { id: 'perps', used: 240, allowance: 1000, kind: 'currency' },
  { id: 'predict', used: 0, allowance: 1, kind: 'count' },
];
