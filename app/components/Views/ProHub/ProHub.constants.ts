import { IconName } from '@metamask/design-system-react-native';

export interface ProHubStats {
  /** Formatted currency string for lifetime Pro earnings. */
  earned: string;
  /** Formatted currency string for lifetime Pro savings. */
  saved: string;
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
  earned: '$500.30',
  saved: '$266.61',
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
}

// TODO: replace with real API data once the membership endpoint is available.
export const MOCK_TRADE_ALLOWANCES: TradeAllowanceItem[] = [
  { id: 'swaps', used: 310, allowance: 500, kind: 'currency' },
  { id: 'perps', used: 240, allowance: 1000, kind: 'currency' },
  { id: 'predict', used: 0, allowance: 1, kind: 'count' },
];
