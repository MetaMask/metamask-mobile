import type { Json } from '@metamask/utils';
import {
  getUsableLastLocalFlowConfirmedAt,
  type PersistedLocalMoneyFlow,
} from '../../../../core/redux/slices/moneyBalance';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';

/**
 * How long Money balance UI queries keep `{ fresh: true, minBlock }` in their
 * query key after a confirmed transaction.
 *
 * The data-service `useQuery` hook uses `staleTime: 0` and a 30s
 * `refetchInterval`. Those refetches map the query key to messenger args, so
 * putting fresh options on the key makes interval polls bypass the Money API
 * response cache. Matches the `moneyAccountBalanceStaletime` production
 * default (2 minutes).
 */
export const FRESH_MONEY_BALANCE_WINDOW_MS = 2 * 60 * 1000;

export interface MoneyBalanceFreshOptions {
  fresh: true;
  minBlock?: number;
}

/**
 * `useQuery` requires `[string, ...Json[]]`. Named option objects are not
 * assignable to `Json` (no index signature), so the third segment is typed as
 * `Json` at the query-key boundary.
 */
export type MoneyAccountBalanceQueryKey =
  | [
      typeof MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
      string,
    ]
  | [
      typeof MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
      string,
      Json,
    ];

/**
 * Builds a Json-compatible options object for the Money balance query key.
 *
 * @param options - Fresh-read options for the post-confirm window.
 * @returns Options as a `Json` value for the query key / messenger args.
 */
export function toMoneyBalanceFreshOptionsJson(
  options: MoneyBalanceFreshOptions,
): Json {
  return {
    fresh: options.fresh,
    ...(options.minBlock !== undefined ? { minBlock: options.minBlock } : {}),
  };
}

/**
 * Builds the UI query key for the Money balance facade.
 *
 * Extra key segments are forwarded as messenger args by `createUIQueryClient`,
 * so a fresh-options segment becomes
 * `fetchBalanceWithFallback(address, { fresh, minBlock })`.
 *
 * @param address - Money account address (same casing as the UI query).
 * @param freshOptions - Optional post-confirm fresh-read options.
 * @returns Query key for the facade.
 */
export function getMoneyAccountBalanceQueryKey(
  address: string,
  freshOptions?: MoneyBalanceFreshOptions,
): MoneyAccountBalanceQueryKey {
  if (freshOptions) {
    return [
      MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
      address,
      toMoneyBalanceFreshOptionsJson(freshOptions),
    ];
  }
  return [
    MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
    address,
  ];
}

/**
 * Fresh-read options for the Money balance query while the post-confirm
 * window is open for this account.
 *
 * @param marker - Last local Money flow from Redux.
 * @param address - Money account currently in view.
 * @param now - Clock injection for tests.
 * @returns Fresh options, or undefined when the window does not apply.
 */
export function getFreshMoneyBalanceOptionsFromLocalFlow(
  marker: PersistedLocalMoneyFlow | number | null | undefined,
  address: string | undefined,
  now = Date.now(),
): MoneyBalanceFreshOptions | undefined {
  const confirmedAt = getUsableLastLocalFlowConfirmedAt(marker, address);
  if (
    confirmedAt === undefined ||
    now >= confirmedAt + FRESH_MONEY_BALANCE_WINDOW_MS
  ) {
    return undefined;
  }

  const minBlock =
    typeof marker === 'object' && marker !== null ? marker.minBlock : undefined;

  return {
    fresh: true,
    ...(minBlock !== undefined && { minBlock }),
  };
}
