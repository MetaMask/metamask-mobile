import {
  BannerAlertSeverity,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';

export interface ProHubStats {
  /** Formatted currency string for lifetime Pro earnings. */
  lifetimeEarnings: string;
  /** Formatted currency string for Money balance earnings. */
  moneyBalance: string;
  /** Annual percentage yield earned on the Money balance, as a percentage. */
  moneyBalanceApy: number;
  /** Formatted currency string for mUSD back earnings. */
  musdBack: string;
  /** Share of spend returned as mUSD, as a percentage. */
  musdBackRate: number;
  /** Formatted date by which funds must be added to keep the membership. */
  addFundsDueDate: string;
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
  moneyBalanceApy: 7,
  musdBack: '$0.00',
  musdBackRate: 3,
  addFundsDueDate: 'Oct 12',
};

export const MembershipBannerKind = {
  ActiveLowBalance: 'activeLowBalance',
  ActiveRenewalFailed: 'activeRenewalFailed',
  Overdue: 'overdue',
  Deactivated: 'deactivated',
} as const;

export type MembershipBannerKind =
  (typeof MembershipBannerKind)[keyof typeof MembershipBannerKind];

export interface MembershipBannerState {
  kind: MembershipBannerKind;
  statusKey: string;
  iconColor: IconColor;
  bannerSeverity: BannerAlertSeverity;
  titleKey: string;
  descriptionKey: string;
  actionKey: string;
  interpolatesDate: boolean;
}

export const MEMBERSHIP_BANNER_STATES: Record<
  MembershipBannerKind,
  MembershipBannerState
> = {
  [MembershipBannerKind.ActiveLowBalance]: {
    kind: MembershipBannerKind.ActiveLowBalance,
    statusKey: 'pro_hub.membership_status.active',
    iconColor: IconColor.PrimaryDefault,
    bannerSeverity: BannerAlertSeverity.Info,
    titleKey: 'pro_hub.membership_alert.low_balance.title',
    descriptionKey: 'pro_hub.membership_alert.low_balance.description',
    actionKey: 'pro_hub.membership_alert.low_balance.action',
    interpolatesDate: true,
  },
  [MembershipBannerKind.ActiveRenewalFailed]: {
    kind: MembershipBannerKind.ActiveRenewalFailed,
    statusKey: 'pro_hub.membership_status.active',
    iconColor: IconColor.WarningDefault,
    bannerSeverity: BannerAlertSeverity.Warning,
    titleKey: 'pro_hub.membership_alert.renewal_failed.title',
    descriptionKey: 'pro_hub.membership_alert.renewal_failed.description',
    actionKey: 'pro_hub.membership_alert.renewal_failed.action',
    interpolatesDate: false,
  },
  [MembershipBannerKind.Overdue]: {
    kind: MembershipBannerKind.Overdue,
    statusKey: 'pro_hub.membership_status.overdue',
    iconColor: IconColor.ErrorDefault,
    bannerSeverity: BannerAlertSeverity.Danger,
    titleKey: 'pro_hub.membership_alert.payment_failed.title',
    descriptionKey: 'pro_hub.membership_alert.payment_failed.description',
    actionKey: 'pro_hub.membership_alert.payment_failed.action',
    interpolatesDate: false,
  },
  [MembershipBannerKind.Deactivated]: {
    kind: MembershipBannerKind.Deactivated,
    statusKey: 'pro_hub.membership_status.deactivated',
    iconColor: IconColor.ErrorDefault,
    bannerSeverity: BannerAlertSeverity.Danger,
    titleKey: 'pro_hub.membership_alert.inactive.title',
    descriptionKey: 'pro_hub.membership_alert.inactive.description',
    actionKey: 'pro_hub.membership_alert.inactive.action',
    interpolatesDate: false,
  },
};

// TODO: replace with real membership status from the API.
export const MOCK_MEMBERSHIP_BANNER_KIND =
  MembershipBannerKind.ActiveLowBalance;

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
