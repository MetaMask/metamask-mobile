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
 * Secondary "Perps" filter buckets, shown in place of the network selector when
 * the top-level Type filter is `Perps`. Each maps to a subset of the Perps
 * `ActivityKind`s, derived from the perps source `transaction.type`
 * (trade / order / funding / deposit|withdrawal) — see `perps-transaction.ts`.
 *
 * String values mirror metamask-extension's `PerpsTransactionFilter`
 * (`trade | order | funding | deposit`) for cross-platform parity. Display
 * labels intentionally follow the mobile ticket (Trades / Order / Fundings /
 * Deposits) — see PERPS_ACTIVITY_FILTER_LABEL_KEY.
 */
export enum PerpsActivityFilter {
  Trades = 'trade',
  Order = 'order',
  Fundings = 'funding',
  Deposits = 'deposit',
}

/**
 * Bucket → kinds mapping for the Perps sub-filter. This is the single source of
 * truth for which kinds count as "Perps": `ACTIVITY_TYPE_FILTER_KINDS[Perps]`
 * is derived from the union of these buckets, so a new Perps kind only needs to
 * be added here (in exactly one bucket). Withdrawals are grouped under
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

/**
 * Every kind that counts as "Perps", derived from the sub-buckets so the
 * top-level Perps bucket and the sub-filter buckets can never drift.
 */
const PERPS_ACTIVITY_KINDS: ReadonlySet<ActivityKind> = new Set(
  Object.values(PERPS_ACTIVITY_FILTER_KINDS).flatMap((kinds) => [...kinds]),
);

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
  // Derived from the Perps sub-buckets — see PERPS_ACTIVITY_FILTER_KINDS.
  [ActivityTypeFilter.Perps]: PERPS_ACTIVITY_KINDS,
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
 * Resolves the set of kinds for an active Perps sub-filter, or `undefined` when
 * there is no/unknown sub-filter (callers then apply no narrowing). Returning
 * `undefined` for an unknown value degrades gracefully instead of crashing.
 */
export function getPerpsSubFilterKinds(
  filter: PerpsActivityFilter | undefined,
): ReadonlySet<ActivityKind> | undefined {
  if (filter === undefined) {
    return undefined;
  }
  return PERPS_ACTIVITY_FILTER_KINDS[filter];
}

/** Route params the redesigned Activity screen reads to become context-aware. */
export interface ActivityScreenParams {
  /**
   * Pre-selects the Type filter when navigating into Activity from a context
   * (e.g. Perps → Perps, Predict → Predictions).
   */
  initialTypeFilter?: ActivityTypeFilter;
  initialPerpsFilter?: PerpsActivityFilter;
  /** Legacy redirect hints, mapped to a Type filter for back-compat. */
  redirectToPerpsTransactions?: boolean;
  redirectToOrders?: boolean;
}

/**
 * Resolves the initial Type filter for the Activity screen from its route
 * params: an explicit, selectable `initialTypeFilter` wins; otherwise the
 * legacy redirect hints map to a bucket (Perps / Buy-Sell); otherwise the
 * default Transactions filter.
 */
export function resolveInitialActivityTypeFilter(
  params: ActivityScreenParams | undefined,
): ActivityTypeFilter {
  const explicit = params?.initialTypeFilter;
  if (explicit && ACTIVITY_TYPE_FILTER_ORDER.includes(explicit)) {
    return explicit;
  }
  if (params?.redirectToPerpsTransactions) {
    return ActivityTypeFilter.Perps;
  }
  if (params?.redirectToOrders) {
    return ActivityTypeFilter.BuySell;
  }
  return ActivityTypeFilter.Transactions;
}
