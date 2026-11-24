import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectPrefilledAmountConfig } from '../../../../../selectors/featureFlagController/confirmations';
import type { RootState } from '../../../../../reducers';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS,
} from './abTestConfig';
import type { MoneyAccountDepositIntent } from '../../../../UI/Money/utils/moneyAccountDepositIntent';
import { isMoneyAccountDepositPrefillEnabled } from './isMoneyAccountDepositPrefillEnabled';

/**
 * Kill-switch + A/B assignment for Money Account deposit prefill loader.
 * Uses trackExposure: false so Money home does not count as experiment exposure;
 * Experiment Viewed is emitted from MoneyAccountDepositInfo.
 */
export function useMoneyAccountDepositPrefillEnabled(): (
  intent?: MoneyAccountDepositIntent,
) => boolean {
  const remotePrefillEnabled = useSelector(
    (state: RootState) =>
      selectPrefilledAmountConfig(state, 'moneyAccountDeposit').enabled,
  );
  // Assignment only — Experiment Viewed is emitted from MoneyAccountDepositInfo.
  const { variant: depositPrefillVariant } = useABTest(
    MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
    MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS,
    { trackExposure: false },
  );

  return useCallback(
    (intent?: MoneyAccountDepositIntent) =>
      isMoneyAccountDepositPrefillEnabled({
        remotePrefillEnabled,
        abTestPrefillEnabled: depositPrefillVariant.prefillEnabled,
        intent,
        forceFullBalanceIntent: true,
      }),
    [depositPrefillVariant.prefillEnabled, remotePrefillEnabled],
  );
}
