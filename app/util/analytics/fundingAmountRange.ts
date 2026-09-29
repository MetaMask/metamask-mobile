import Logger from '../Logger';

/**
 * USD buckets for the `funding_amount_range` prop on `Wallet Setup
 * Completed` (import flow). Mirrors the enum in the segment-schema repo.
 */
export type FundingAmountRange =
  | '< 0.01'
  | '0.01 - 9.99'
  | '10.00 - 99.99'
  | '100.00 - 999.99'
  | '1000.00 - 9999.99'
  | '10000.00+';

/**
 * Buckets a USD balance into a funding range. Intervals are half-open:
 * 10.00 falls in '10.00 - 99.99'. Only pass successfully fetched amounts —
 * '< 0.01' must always mean a confirmed zero balance.
 */
export const getFundingAmountRange = (amount: number): FundingAmountRange => {
  if (amount < 0.01) return '< 0.01';
  if (amount < 10) return '0.01 - 9.99';
  if (amount < 100) return '10.00 - 99.99';
  if (amount < 1000) return '100.00 - 999.99';
  if (amount < 10000) return '1000.00 - 9999.99';
  return '10000.00+';
};

/**
 * Fetch budget retained for API compatibility with callers that reference
 * it; the fetch itself is currently a no-op (see below).
 */
export const FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS = 20000;

/**
 * Resolves the funding range of the selected account group (Account 1 at
 * import time) for the `funding_amount_range` prop on `Wallet Setup
 * Completed`.
 *
 * Always resolves undefined (prop omitted, "(not set)" in Mixpanel):
 * `AssetsController` refreshes its own state independently of this call, so
 * there is no legacy controller refresh path left to trigger here. This
 * function never throws and never blocks the caller.
 */
export async function fetchImportedWalletFundingAmountRange(): Promise<
  FundingAmountRange | undefined
> {
  Logger.log(
    'fundingAmountRange: funding_amount_range omitted (legacy balance refresh path has been removed)',
  );
  return undefined;
}
