import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectPrefilledAmountConfig } from '../../../../../selectors/featureFlagController/confirmations';
import type { RootState } from '../../../../../reducers';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS,
} from './abTestConfig';
import { isMoneyAccountDepositPrefillEnabled } from './isMoneyAccountDepositPrefillEnabled';

/**
 * Kill-switch + A/B assignment for Money Account deposit prefill loader.
 * Uses trackExposure: false so Money home does not count as experiment exposure;
 * Experiment Viewed is emitted from MoneyAccountDepositInfo.
 */
export function useMoneyAccountDepositPrefillEnabled(): (
  intent?: 'convert' | 'addMusd' | 'card',
) => boolean {
  const prefillConfig = useSelector((state: RootState) =>
    selectPrefilledAmountConfig(state, 'moneyAccountDeposit'),
  );
  // Assignment only — Experiment Viewed is emitted from MoneyAccountDepositInfo.
  const { variant: depositPrefillVariant } = useABTest(
    MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
    MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS,
    { trackExposure: false },
  );

  return useCallback(
    (intent?: 'convert' | 'addMusd' | 'card') =>
      isMoneyAccountDepositPrefillEnabled({
        remotePrefillEnabled: prefillConfig.enabled,
        abTestPrefillEnabled: depositPrefillVariant.prefillEnabled,
        intent,
        // Loader should show PrefillCustomAmount for addMusd; amount autofill
        // for that intent is handled separately at 100% in useTransactionCustomAmount.
        forceAddMusd: true,
      }),
    [depositPrefillVariant.prefillEnabled, prefillConfig.enabled],
  );
}
