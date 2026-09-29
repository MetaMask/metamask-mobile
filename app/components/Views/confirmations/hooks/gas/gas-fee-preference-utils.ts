import type { AdvancedGasFeePreferences } from '../../../../../core/Engine/controllers/preferences-controller-types';

type CustomGasFeePreferences = Pick<AdvancedGasFeePreferences, 'userFeeLevel'> &
  Partial<
    Pick<AdvancedGasFeePreferences, 'gasPrice' | 'maxBaseFee' | 'priorityFee'>
  >;

export function hasValidCustomGasFeePreferences(
  gasFeePreferences: CustomGasFeePreferences,
): boolean {
  return Boolean(
    gasFeePreferences.gasPrice ||
      (gasFeePreferences.maxBaseFee && gasFeePreferences.priorityFee),
  );
}
