import { Json } from '@metamask/utils';

/**
 * How long UI refetches of the Money balance facade keep sending
 * `{ fresh: true, minBlock }` after a confirmed transaction.
 *
 * The data-service `useQuery` hook uses `staleTime: 0` and a 30s
 * `refetchInterval`. Those refetches call `fetchBalanceWithFallback` with no
 * options, so the Money API can answer from its response cache and overwrite
 * the balance just written for the confirmation. The window matches the
 * `moneyAccountBalanceStaletime` production default (2 minutes).
 */
export const FRESH_MONEY_BALANCE_WINDOW_MS = 2 * 60 * 1000;

const FETCH_BALANCE_WITH_FALLBACK =
  'MoneyAccountBalanceService:fetchBalanceWithFallback';

interface FreshMoneyBalanceWindow {
  address: string;
  minBlock?: number;
  until: number;
}

let freshMoneyBalanceWindow: FreshMoneyBalanceWindow | undefined;

/**
 * Keep subsequent facade refetches on the fresh path for this account.
 *
 * @param address - Money account address the confirmed transaction moved.
 * @param minBlock - Confirmed block the API result must reach, when known.
 * @param now - Clock injection for tests.
 */
export function armFreshMoneyBalanceWindow(
  address: string,
  minBlock?: number,
  now = Date.now(),
): void {
  freshMoneyBalanceWindow = {
    address,
    minBlock,
    until: now + FRESH_MONEY_BALANCE_WINDOW_MS,
  };
}

/** Drops the post-confirm fresh window. Test-only. */
export function clearFreshMoneyBalanceWindow(): void {
  freshMoneyBalanceWindow = undefined;
}

/**
 * Options to append to a no-options facade call while the window is open.
 *
 * @param address - Address on the query key.
 * @param now - Clock injection for tests.
 * @returns Fresh-read options, or undefined when the window does not apply.
 */
export function getFreshMoneyBalanceCallOptions(
  address: string,
  now = Date.now(),
): { fresh: true; minBlock?: number } | undefined {
  if (
    !freshMoneyBalanceWindow ||
    now >= freshMoneyBalanceWindow.until ||
    freshMoneyBalanceWindow.address.toLowerCase() !== address.toLowerCase()
  ) {
    return undefined;
  }

  return {
    fresh: true,
    ...(freshMoneyBalanceWindow.minBlock !== undefined && {
      minBlock: freshMoneyBalanceWindow.minBlock,
    }),
  };
}

/**
 * Appends fresh-read options when the UI query client refetches the Money
 * balance facade with only an address. Calls that already pass options, and
 * every other messenger action, are left unchanged.
 *
 * @param method - Messenger action name.
 * @param params - Action arguments from the query key.
 * @param now - Clock injection for tests.
 * @returns Arguments to forward to the messenger.
 */
export function withFreshMoneyBalanceOptions(
  method: string,
  params: Json[],
  now = Date.now(),
): Json[] {
  if (
    method !== FETCH_BALANCE_WITH_FALLBACK ||
    params.length !== 1 ||
    typeof params[0] !== 'string'
  ) {
    return params;
  }

  const freshOptions = getFreshMoneyBalanceCallOptions(params[0], now);
  if (!freshOptions) {
    return params;
  }

  return [params[0], freshOptions];
}
