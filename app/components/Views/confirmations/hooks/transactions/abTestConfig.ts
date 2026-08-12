import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `confirmations`, ticket CONF-1775).
 *
 * @see https://consensyssoftware.atlassian.net/browse/CONF-1775
 */
export const MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY =
  'confirmationsCONF1775AbtestMoneyAccountDepositPrefill';

export enum MoneyAccountDepositPrefillVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface MoneyAccountDepositPrefillVariantConfig {
  /** When true, money account deposit amount is prefilled. */
  prefillEnabled: boolean;
}

export const MONEY_ACCOUNT_DEPOSIT_PREFILL_VARIANTS: Record<
  MoneyAccountDepositPrefillVariant,
  MoneyAccountDepositPrefillVariantConfig
> = {
  [MoneyAccountDepositPrefillVariant.Control]: {
    prefillEnabled: false,
  },
  [MoneyAccountDepositPrefillVariant.Treatment]: {
    prefillEnabled: true,
  },
};

/**
 * Shared third argument for `useABTest` on this experiment (exposure +
 * consistent variation labels).
 */
export const MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Money Account Deposit Prefill',
  variationNames: {
    control: 'Deposit amount not prefilled',
    treatment: 'Deposit amount prefilled',
  },
} as const;

/**
 * Builds `active_ab_tests` entries for money account deposit Transaction Added
 * when the deposit-prefill experiment assignment is active.
 */
export function getMoneyAccountDepositPrefillTransactionActiveAbTests(
  isAssignmentActive: boolean,
  variantName: string,
): TransactionActiveAbTestEntry[] | undefined {
  if (!isAssignmentActive) {
    return undefined;
  }
  return [
    createActiveABTestAssignment(
      MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
      variantName,
    ),
  ];
}
