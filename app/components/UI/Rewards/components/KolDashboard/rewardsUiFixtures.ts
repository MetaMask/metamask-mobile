/**
 * Static KOL Rewards UI fixtures for the visual-shell draft.
 * Engineers replace these with selectors / controller data.
 */
export const KOL_REFERRAL_CODE_FALLBACK = '8F3A21';

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
      kind: 'referrals' as const,
      relativeTime: '2h ago',
      amount: 24.5,
    },
    {
      id: 'hist-2',
      kind: 'commission' as const,
      relativeTime: '5h ago',
      amount: 18.2,
    },
    {
      id: 'hist-3',
      kind: 'rebate' as const,
      relativeTime: '8h ago',
      amount: 7.65,
    },
    {
      id: 'hist-4',
      kind: 'referrals' as const,
      relativeTime: '1d ago',
      amount: 12.4,
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
      key: 'confirmed' as const,
      value: 12,
    },
    {
      key: 'active' as const,
      value: 8,
    },
    {
      key: 'feeGenerating' as const,
      value: 5,
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
  ],
};

export const formatUsd = (amount: number): string =>
  `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatSignedUsd = (amount: number): string =>
  `+${formatUsd(amount)}`;
