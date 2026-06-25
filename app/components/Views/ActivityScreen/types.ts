import type { ActivityKind } from '../../../util/activity-adapters';

export type { ActivityKind };

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

// TODO: re-enable `ActivityTypeFilter.All` once the data sources are unified
// (deduped, time-sorted across EVM tx controller, non-EVM keyrings, perps,
// predict, etc.). Until then we ship type-only filtering — see TMCU thread.
export const ACTIVITY_TYPE_FILTER_ORDER: ActivityTypeFilter[] = [
  // ActivityTypeFilter.All,
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
