/**
 * Static KOL Rewards UI fixtures for the visual-shell draft.
 * Engineers replace these with selectors / controller data.
 */
export const KOL_REFERRAL_CODE_FALLBACK = '8F3A21';

/**
 * Which Rewards audience the dashboard renders for. A local UI switch for the
 * visual shell: engineers derive this from referral/subscription state.
 */
export type RewardsUiPersona = 'kol' | 'invited';

export const REWARDS_UI_DEFAULT_PERSONA: RewardsUiPersona = 'kol';

export const KOL_INVITE_FIXTURE = {
  referralCode: KOL_REFERRAL_CODE_FALLBACK,
  codeLength: 6,
};

/**
 * Partner tax-form URL opened from the claim gate. Engineers replace this
 * with the live onboarding link once the tax vendor is wired.
 */
export const KOL_TAX_FORM_URL = 'https://link.metamask.io/rewards/tax-form';

export type KolEarningsHistoryKind =
  | 'rebate'
  | 'referrals'
  | 'claimed'
  | 'commission'
  | 'promo';

export const KOL_EARNINGS_FIXTURE = {
  referralsRecorded: 41.75,
  tradeCommissionsRecorded: 41.8,
  availableToClaim: 342.86,
  last7Days: 91.2,
  recordedEarnings: 357.31,
  tradingRebates: 7.65,
  history: [
    {
      id: 'hist-1',
      kind: 'rebate' as const,
      relativeTime: '8h ago',
      amount: 7.65,
    },
    {
      id: 'hist-2',
      kind: 'referrals' as const,
      relativeTime: '1d ago',
      amount: 12.4,
    },
    {
      id: 'hist-3',
      kind: 'claimed' as const,
      relativeTime: '2d ago',
      amount: -32.4,
    },
    {
      id: 'hist-4',
      kind: 'commission' as const,
      relativeTime: '2d ago',
      amount: 9.15,
    },
    {
      id: 'hist-5',
      kind: 'referrals' as const,
      relativeTime: '3d ago',
      amount: 4.85,
    },
    {
      id: 'hist-6',
      kind: 'commission' as const,
      relativeTime: '3d ago',
      amount: 6.4,
    },
    {
      id: 'hist-7',
      kind: 'commission' as const,
      relativeTime: '4d ago',
      amount: 4.8,
    },
    {
      id: 'hist-8',
      kind: 'commission' as const,
      relativeTime: '5d ago',
      amount: 3.25,
    },
    {
      id: 'hist-9',
      kind: 'claimed' as const,
      relativeTime: '1w ago',
      amount: -18.75,
    },
    {
      id: 'hist-10',
      kind: 'promo' as const,
      relativeTime: '1w ago',
      amount: 266.11,
    },
  ],
};

export const KOL_PERFORMANCE_FIXTURE = {
  eligibleFeesLabel: '$12.5K',
  funnelMax: 18,
  funnel: [
    {
      key: 'codeUses' as const,
      value: 18,
    },
    {
      key: 'active' as const,
      value: 8,
    },
  ],
  commissions: [
    {
      id: 'eth',
      symbol: 'ETH',
      relativeTime: '5h ago',
      amount: 18.2,
      copiedTimes: 2,
    },
    {
      id: 'sol',
      symbol: 'SOL',
      relativeTime: '2d ago',
      amount: 9.15,
      copiedTimes: 1,
    },
    {
      id: 'btc',
      symbol: 'BTC',
      label: 'Short BTC',
      relativeTime: '3d ago',
      amount: 6.4,
      copiedTimes: 3,
    },
    {
      id: 'usdc',
      symbol: 'USDC',
      relativeTime: '3d ago',
      amount: 5.1,
      copiedTimes: 2,
    },
    {
      id: 'uni',
      symbol: 'UNI',
      relativeTime: '4d ago',
      amount: 4.8,
      copiedTimes: 1,
    },
    {
      id: 'link',
      symbol: 'LINK',
      relativeTime: '4d ago',
      amount: 3.65,
      copiedTimes: 4,
    },
    {
      id: 'avax',
      symbol: 'AVAX',
      relativeTime: '5d ago',
      amount: 3.25,
      copiedTimes: 1,
    },
    {
      id: 'pepe',
      symbol: 'PEPE',
      relativeTime: '6d ago',
      amount: 2.9,
      copiedTimes: 2,
    },
    {
      id: 'arb',
      symbol: 'ARB',
      relativeTime: '1w ago',
      amount: 2.15,
      copiedTimes: 1,
    },
    {
      id: 'doge',
      symbol: 'DOGE',
      relativeTime: '1w ago',
      amount: 1.8,
      copiedTimes: 3,
    },
    {
      id: 'op',
      symbol: 'OP',
      relativeTime: '1w ago',
      amount: 1.55,
      copiedTimes: 1,
    },
    {
      id: 'matic',
      symbol: 'MATIC',
      relativeTime: '8d ago',
      amount: 1.32,
      copiedTimes: 2,
    },
    {
      id: 'weth',
      symbol: 'WETH',
      relativeTime: '9d ago',
      amount: 1.1,
      copiedTimes: 1,
    },
    {
      id: 'aave',
      symbol: 'AAVE',
      relativeTime: '10d ago',
      amount: 0.95,
      copiedTimes: 2,
    },
    {
      id: 'crv',
      symbol: 'CRV',
      relativeTime: '2w ago',
      amount: 0.72,
      copiedTimes: 1,
    },
  ],
  rebates: [
    {
      id: 'rebate-1',
      titleKey: 'rebate_perps_volume' as const,
      iconName: 'Candlestick' as const,
      relativeTime: '8h ago',
      amount: 7.65,
    },
    {
      id: 'rebate-2',
      titleKey: 'rebate_swaps_volume' as const,
      iconName: 'SwapVertical' as const,
      relativeTime: '1d ago',
      amount: 4.2,
    },
    {
      id: 'rebate-3',
      titleKey: 'rebate_predictions' as const,
      iconName: 'Predictions' as const,
      relativeTime: '3d ago',
      amount: 2.15,
    },
    {
      id: 'rebate-4',
      titleKey: 'rebate_swaps' as const,
      iconName: 'SwapHorizontal' as const,
      relativeTime: '5d ago',
      amount: 1.4,
    },
    {
      id: 'rebate-5',
      titleKey: 'rebate_perps_volume' as const,
      iconName: 'Candlestick' as const,
      relativeTime: '6d ago',
      amount: 1.25,
    },
    {
      id: 'rebate-6',
      titleKey: 'rebate_swaps_volume' as const,
      iconName: 'SwapVertical' as const,
      relativeTime: '1w ago',
      amount: 1.08,
    },
    {
      id: 'rebate-7',
      titleKey: 'rebate_predictions' as const,
      iconName: 'Predictions' as const,
      relativeTime: '1w ago',
      amount: 0.94,
    },
    {
      id: 'rebate-8',
      titleKey: 'rebate_swaps' as const,
      iconName: 'SwapHorizontal' as const,
      relativeTime: '8d ago',
      amount: 0.81,
    },
    {
      id: 'rebate-9',
      titleKey: 'rebate_perps_volume' as const,
      iconName: 'Candlestick' as const,
      relativeTime: '9d ago',
      amount: 0.73,
    },
    {
      id: 'rebate-10',
      titleKey: 'rebate_swaps_volume' as const,
      iconName: 'SwapVertical' as const,
      relativeTime: '10d ago',
      amount: 0.66,
    },
    {
      id: 'rebate-11',
      titleKey: 'rebate_predictions' as const,
      iconName: 'Predictions' as const,
      relativeTime: '11d ago',
      amount: 0.58,
    },
    {
      id: 'rebate-12',
      titleKey: 'rebate_swaps' as const,
      iconName: 'SwapHorizontal' as const,
      relativeTime: '12d ago',
      amount: 0.51,
    },
    {
      id: 'rebate-13',
      titleKey: 'rebate_perps_volume' as const,
      iconName: 'Candlestick' as const,
      relativeTime: '13d ago',
      amount: 0.44,
    },
    {
      id: 'rebate-14',
      titleKey: 'rebate_swaps_volume' as const,
      iconName: 'SwapVertical' as const,
      relativeTime: '2w ago',
      amount: 0.37,
    },
    {
      id: 'rebate-15',
      titleKey: 'rebate_predictions' as const,
      iconName: 'Predictions' as const,
      relativeTime: '2w ago',
      amount: 0.29,
    },
  ],
};

export const KOL_PERFORMANCE_PREVIEW_COUNT = 5;
export const KOL_EARNINGS_HISTORY_PREVIEW_COUNT = 5;

export type KolEarningsHistoryItem =
  (typeof KOL_EARNINGS_FIXTURE.history)[number];

export const getEarningsHistory = (
  hideReferrals = false,
): KolEarningsHistoryItem[] =>
  hideReferrals
    ? KOL_EARNINGS_FIXTURE.history.filter((item) => item.kind !== 'referrals')
    : KOL_EARNINGS_FIXTURE.history;

export type KolPerformanceCommission =
  (typeof KOL_PERFORMANCE_FIXTURE.commissions)[number];
export type KolPerformanceRebate =
  (typeof KOL_PERFORMANCE_FIXTURE.rebates)[number];

export const formatUsd = (amount: number): string => {
  // Hermes ships without full ICU, so `toLocaleString` options are ignored and
  // amounts render as `$91.2`. Fix the decimals first, then group manually.
  const [whole, decimals] = Math.abs(amount).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/gu, ',');
  return `${amount < 0 ? '-' : ''}$${grouped}.${decimals}`;
};

export const formatSignedUsd = (amount: number): string => {
  const absolute = formatUsd(Math.abs(amount));
  return amount < 0 ? `-${absolute}` : `+${absolute}`;
};
