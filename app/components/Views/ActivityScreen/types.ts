import {
  PERPS_ORDER_KINDS,
  type ActivityKind,
} from '../../../util/activity-adapters';
import type { ActivityScreenEntryPoint } from '../../../core/Analytics/events/activity';

export type { ActivityKind };

/** Top-level "Types" filter buckets, mapped to kinds by `ACTIVITY_TYPE_FILTER_KINDS`. */
export enum ActivityTypeFilter {
  All = 'all',
  Transactions = 'transactions',
  BuySell = 'buySell',
  Perps = 'perps',
  Predictions = 'predictions',
  MetamaskCard = 'metamaskCard',
}

/**
 * Secondary "Perps" buckets, shown in place of the network selector when the
 * Type filter is `Perps`. Values stay singular to mirror extension's
 * `PerpsTransactionFilter`, even where the member and label are plural.
 */
export enum PerpsActivityFilter {
  Trades = 'trade',
  Orders = 'order',
  Fundings = 'funding',
  Deposits = 'deposit',
}

/**
 * Single source of truth for which kinds count as "Perps" — add a new kind here
 * (in exactly one bucket) and the top-level bucket picks it up. Withdrawals sit
 * under `Deposits` per product.
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

  [PerpsActivityFilter.Orders]: new Set<ActivityKind>(PERPS_ORDER_KINDS),
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
  PerpsActivityFilter.Orders,
  PerpsActivityFilter.Fundings,
  PerpsActivityFilter.Deposits,
];

/** Derived from the sub-buckets so the two can never drift. */
const PERPS_ACTIVITY_KINDS: ReadonlySet<ActivityKind> = new Set(
  Object.values(PERPS_ACTIVITY_FILTER_KINDS).flatMap((kinds) => [...kinds]),
);

/**
 * Bucket → kinds. `null` matches everything.
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
    'assetActivation',
    'assetDeactivation',
    'deposit',
    'stake',
    'claim',
    'unstake',
    'lendingDeposit',
    'lendingWithdrawal',
    'claimMusdBonus',
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
};

// TODO: re-enable `ActivityTypeFilter.All` once the data sources are unified
// (deduped and time-sorted across EVM, non-EVM, perps and predict).
export const ACTIVITY_TYPE_FILTER_ORDER: ActivityTypeFilter[] = [
  // ActivityTypeFilter.All,
  ActivityTypeFilter.Transactions,
  ActivityTypeFilter.BuySell,
  ActivityTypeFilter.Perps,
  ActivityTypeFilter.Predictions,
  ActivityTypeFilter.MetamaskCard,
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
 * Kinds for an active Perps sub-filter.
 *
 * @param filter - Active sub-filter, if any.
 * @returns Matching kinds, or `undefined` when there is no or an unknown
 * sub-filter, so callers narrow nothing rather than crash.
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
  /** Pre-selects the Type filter, e.g. Perps → Perps, Predict → Predictions. */
  initialTypeFilter?: ActivityTypeFilter;
  entryPoint?: ActivityScreenEntryPoint;
  initialPerpsFilter?: PerpsActivityFilter;
  /** Legacy redirect hints, mapped to a Type filter for back-compat. */
  redirectToPerpsTransactions?: boolean;
  redirectToOrders?: boolean;
}

/**
 * @param params - Route params for the Activity screen.
 * @returns A selectable `initialTypeFilter` if given, else the bucket implied
 * by the legacy redirect hints, else `Transactions`.
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
