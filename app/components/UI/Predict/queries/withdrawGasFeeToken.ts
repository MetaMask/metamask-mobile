import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';

export interface PredictWithdrawGasFeeTokenParams {
  address: string;
  amountRaw: string;
}

/**
 * Query key factory for Predict withdraw gas fee token checks.
 *
 * - `all()`: prefix key that invalidates every entry.
 * - `detail(params)`: one entry per account and withdraw amount.
 */
export const predictWithdrawGasFeeTokenKeys = {
  all: () => ['predict', 'withdrawGasFeeToken'] as const,
  detail: ({ address, amountRaw }: PredictWithdrawGasFeeTokenParams) =>
    [
      ...predictWithdrawGasFeeTokenKeys.all(),
      address.toLowerCase(),
      amountRaw,
    ] as const,
};

export const predictWithdrawGasFeeTokenOptions = (
  params: PredictWithdrawGasFeeTokenParams,
) =>
  queryOptions<boolean, Error>({
    queryKey: predictWithdrawGasFeeTokenKeys.detail(params),
    queryFn: () =>
      Engine.context.PredictController.isWithdrawGasFeeTokenAvailable(params),
    // `getGasFeeTokens` returns `[]` when Sentinel fails, so a `false` result
    // can come from an outage rather than a real "can't pay". Let it go stale
    // right away so the same amount is checked again instead of staying cached.
    staleTime: (query) => (query.state.data === false ? 0 : 30_000),
    retry: 1,
  });
