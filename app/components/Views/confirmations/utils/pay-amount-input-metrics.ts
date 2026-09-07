import {
  TransactionMeta,
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import type { RootState } from '../../../../reducers';
import {
  selectFeatureFlagThresholdGroups,
  selectRemoteFeatureFlags,
} from '../../../../selectors/featureFlagController';
import { selectPrefilledAmountConfig } from '../../../../selectors/featureFlagController/confirmations';
import { resolveABTestAssignment } from '../../../../util/abTest';
import { getMoneyAccountDepositIntent } from '../../../UI/Money/utils/moneyAccountDepositIntent';
import {
  MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS,
  MoneyAccountDepositPrefillVariant,
} from '../hooks/transactions/abTestConfig';
import { isMoneyAccountDepositPrefillEnabled } from '../hooks/transactions/isMoneyAccountDepositPrefillEnabled';

export const MM_PAY_AMOUNT_INPUT_TYPE_KEY = 'mm_pay_amount_input_type';
export const MM_PAY_AMOUNT_INPUT_PREFILL_PRESENTED_KEY =
  'mm_pay_amount_input_prefill_presented';

/** Intent-to-treat on Transaction Added before Max vs 50% is known. */
export const MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED = 'prefilled';
export const MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_MAX = 'prefilled_max';
export const MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_50 = 'prefilled_50';

/**
 * Maps an applied deposit prefill to the analytics input-type value.
 * Limit-capped / non-percentage prefills use the generic `prefilled` label.
 */
export function getDepositPrefillAmountInputType({
  percentage,
  isLimitCapped,
}: {
  percentage: number | undefined;
  isLimitCapped: boolean;
}): string {
  if (isLimitCapped || percentage === undefined) {
    return MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED;
  }
  if (percentage === 100) {
    return MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_MAX;
  }
  if (percentage === 50) {
    return MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED_50;
  }
  return MM_PAY_AMOUNT_INPUT_TYPE_PREFILLED;
}

/**
 * Whether Money Account deposit confirmation will present an amount prefill.
 * Uses forceAddMusd so addMusd matches the loader / always-prefill path.
 */
export function resolveMoneyAccountDepositPrefillPresented(
  transactionMeta: TransactionMeta,
  state: RootState,
): boolean {
  if (
    !hasTransactionType(transactionMeta, [TransactionType.moneyAccountDeposit])
  ) {
    return false;
  }

  const intent = getMoneyAccountDepositIntent(transactionMeta.batchId);
  const prefillConfig = selectPrefilledAmountConfig(
    state,
    'moneyAccountDeposit',
  );
  const remoteFeatureFlags = selectRemoteFeatureFlags(state);
  const thresholdGroups = selectFeatureFlagThresholdGroups(state);
  const { variantName } = resolveABTestAssignment(
    remoteFeatureFlags,
    MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
    Object.values(MoneyAccountDepositPrefillVariant),
    thresholdGroups,
  );
  const abTestPrefillEnabled =
    MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS[
      variantName as MoneyAccountDepositPrefillVariant
    ]?.prefillEnabled ??
    MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS[
      MoneyAccountDepositPrefillVariant.Control
    ].prefillEnabled;

  return isMoneyAccountDepositPrefillEnabled({
    remotePrefillEnabled: prefillConfig.enabled,
    abTestPrefillEnabled,
    intent,
    forceAddMusd: true,
  });
}
