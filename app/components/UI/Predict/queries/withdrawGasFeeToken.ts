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
    staleTime: 30_000,
    retry: 1,
  });
