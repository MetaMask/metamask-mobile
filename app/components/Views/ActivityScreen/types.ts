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
    'nftBuy',
    'nftMint',
    'nftSell',
    // Earn/Staking (ETH pooled staking deposit / claim / unstake). Lumped under
    // Transactions for now — they have no dedicated bucket yet.
    'deposit',
    'claim',
    'unstake',
  ]),
  [ActivityTypeFilter.BuySell]: new Set<ActivityKind>(['buy', 'sell']),
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
    'limitShort',
    'limitCloseShort',
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

/**
 * Secondary "Perps" filter buckets, shown in place of the network selector when
 * the top-level Type filter is `Perps`. Each maps to a subset of the Perps
 * `ActivityKind`s, derived from the perps source `transaction.type`
 * (trade / order / funding / deposit|withdrawal) — see `perps-transaction.ts`.
 */
// String values mirror metamask-extension's `PerpsTransactionFilter`
// (`trade | order | funding | deposit`) for cross-platform parity. Display
// labels intentionally follow the mobile ticket (Trades / Order / Fundings /
// Deposits) — see PERPS_ACTIVITY_FILTER_LABEL_KEY.
export enum PerpsActivityFilter {
  Trades = 'trade',
  Order = 'order',
  Fundings = 'funding',
  Deposits = 'deposit',
}

/**
 * Bucket → kinds mapping for the Perps sub-filter. The union of all buckets
 * equals `ACTIVITY_TYPE_FILTER_KINDS[Perps]` (asserted in tests) so every Perps
 * row is reachable from exactly one sub-filter. Withdrawals are grouped under
 * `Deposits` (funds movements) per product.
 */
export const PERPS_ACTIVITY_FILTER_KINDS: Record<
  PerpsActivityFilter,
  ReadonlySet<ActivityKind>
> = {
  [PerpsActivityFilter.Trades]: new Set<ActivityKind>([
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
  ]),
  [PerpsActivityFilter.Order]: new Set<ActivityKind>([
    'marketShort',
    'marketCloseShort',
    'limitShort',
    'limitCloseShort',
    'stopMarketCloseShort',
  ]),
  [PerpsActivityFilter.Fundings]: new Set<ActivityKind>([
    'perpsPaidFundingFees',
    'perpsReceivedFundingFees',
  ]),
  [PerpsActivityFilter.Deposits]: new Set<ActivityKind>([
    'perpsAddFunds',
    'perpsWithdraw',
  ]),
};

// `Trades` is the default selection (per design).
export const PERPS_ACTIVITY_FILTER_ORDER: PerpsActivityFilter[] = [
  PerpsActivityFilter.Trades,
  PerpsActivityFilter.Order,
  PerpsActivityFilter.Fundings,
  PerpsActivityFilter.Deposits,
];

export function perpsActivityKindMatchesFilter(
  kind: ActivityKind,
  filter: PerpsActivityFilter,
): boolean {
  // Guard against an unknown bucket (e.g. a stale persisted/hot-reloaded value)
  // so a bad filter degrades to "no match" instead of crashing render.
  return PERPS_ACTIVITY_FILTER_KINDS[filter]?.has(kind) ?? false;
}
