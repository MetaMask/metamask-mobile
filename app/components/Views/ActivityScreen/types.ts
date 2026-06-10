/**
 * Normalized activity kinds — mirrors the extension's `ActivityKind` union in
 * `shared/lib/activity/types.ts` from the activity-v3 work. Adapters in
 * mobile will normalize EVM/non-EVM/perps/predict/etc. transactions to this
 * shape so the Activity screen can render and filter them uniformly.
 *
 * Source of truth: MetaMask/metamask-extension PR #42837
 *
 * TODO: replace this mirror once the activity adapters + types land in the
 * core controller lib (planned). At that point, import `ActivityKind` from
 * the shared package and delete this local copy. The `ACTIVITY_TYPE_FILTER_KINDS`
 * bucket map below is the only screen-local consumer.
 */
export type ActivityKind =
  | 'send'
  | 'receive'
  | 'buy'
  | 'sell'
  | 'deposit'
  | 'swap'
  | 'swapIncomplete'
  | 'wrap'
  | 'unwrap'
  | 'convert'
  | 'bridge'
  | 'claim'
  | 'claimMusdBonus'
  | 'approveSpendingCap'
  | 'increaseSpendingCap'
  | 'revokeSpendingCap'
  | 'contractInteraction'
  | 'contractDeployment'
  | 'smartAccountUpgrade'
  | 'nftMint'
  | 'lendingDeposit'
  | 'lendingWithdrawal'
  | 'predictionsAddFunds'
  | 'predictionsWithdrawFunds'
  | 'predictionClaimWinnings'
  | 'predictionCashedOut'
  | 'predictionPlaced'
  | 'perpsAddFunds'
  | 'perpsWithdraw'
  | 'perpsOpenLong'
  | 'perpsCloseLong'
  | 'perpsCloseLongLiquidated'
  | 'perpsCloseLongStopLoss'
  | 'perpsCloseLongTakeProfit'
  | 'perpsOpenShort'
  | 'perpsCloseShort'
  | 'perpsCloseShortLiquidated'
  | 'perpsCloseShortStopLoss'
  | 'perpsCloseShortTakeProfit'
  | 'perpsPaidFundingFees'
  | 'perpsReceivedFundingFees'
  | 'marketShort'
  | 'stopMarketCloseShort'
  | 'marketCloseShort';

/**
 * Top-level "Types" filter buckets shown in the Activity screen filter sheet.
 * Each bucket maps to a set of `ActivityKind`s via `ACTIVITY_TYPE_FILTER_KINDS`.
 */
export enum ActivityTypeFilter {
  All = 'all',
  Transactions = 'transactions',
  BuySell = 'buySell',
  Perps = 'perps',
  Predictions = 'predictions',
  MetamaskCard = 'metamaskCard',
  Money = 'money',
}

/**
 * Bucket → kinds mapping. `null` means "no filtering" (matches everything).
 *
 * TODO: refine bucket membership with product/design once adapters land —
 * Money/MetaMask Card definitions are best-guess based on the Figma options.
 */
export const ACTIVITY_TYPE_FILTER_KINDS: Record<
  ActivityTypeFilter,
  ReadonlySet<ActivityKind> | null
> = {
  [ActivityTypeFilter.All]: null,
  [ActivityTypeFilter.Transactions]: new Set<ActivityKind>([
    'send',
    'receive',
    'swap',
    'swapIncomplete',
    'bridge',
    'wrap',
    'unwrap',
    'convert',
    'approveSpendingCap',
    'increaseSpendingCap',
    'revokeSpendingCap',
    'contractInteraction',
    'contractDeployment',
    'smartAccountUpgrade',
    'nftMint',
  ]),
  [ActivityTypeFilter.BuySell]: new Set<ActivityKind>([
    'buy',
    'sell',
    'deposit',
  ]),
  [ActivityTypeFilter.Perps]: new Set<ActivityKind>([
    'perpsAddFunds',
    'perpsWithdraw',
    'perpsOpenLong',
    'perpsCloseLong',
    'perpsCloseLongLiquidated',
    'perpsCloseLongStopLoss',
    'perpsCloseLongTakeProfit',
    'perpsOpenShort',
    'perpsCloseShort',
    'perpsCloseShortLiquidated',
    'perpsCloseShortStopLoss',
    'perpsCloseShortTakeProfit',
    'perpsPaidFundingFees',
    'perpsReceivedFundingFees',
    'marketShort',
    'stopMarketCloseShort',
    'marketCloseShort',
  ]),
  [ActivityTypeFilter.Predictions]: new Set<ActivityKind>([
    'predictionsAddFunds',
    'predictionsWithdrawFunds',
    'predictionClaimWinnings',
    'predictionCashedOut',
    'predictionPlaced',
  ]),
  [ActivityTypeFilter.MetamaskCard]: new Set<ActivityKind>([]),
  [ActivityTypeFilter.Money]: new Set<ActivityKind>([
    'claim',
    'claimMusdBonus',
    'lendingDeposit',
    'lendingWithdrawal',
  ]),
};

export const ACTIVITY_TYPE_FILTER_ORDER: ActivityTypeFilter[] = [
  ActivityTypeFilter.All,
  ActivityTypeFilter.Transactions,
  ActivityTypeFilter.BuySell,
  ActivityTypeFilter.Perps,
  ActivityTypeFilter.Predictions,
  ActivityTypeFilter.MetamaskCard,
  ActivityTypeFilter.Money,
];

export function activityKindMatchesTypeFilter(
  kind: ActivityKind,
  filter: ActivityTypeFilter,
): boolean {
  const allowed = ACTIVITY_TYPE_FILTER_KINDS[filter];
  if (allowed === null) {
    return true;
  }
  return allowed.has(kind);
}
