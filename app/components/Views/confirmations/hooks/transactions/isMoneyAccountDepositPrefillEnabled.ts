import {
  isFullBalanceDepositIntent,
  type MoneyAccountDepositIntent,
} from '../../../../UI/Money/utils/moneyAccountDepositIntent';

/**
 * Shared enablement rule for Money Account deposit amount prefill / prefill loader.
 *
 * - `card` never prefills
 * - otherwise requires remote kill-switch AND A/B treatment (`prefillEnabled`)
 * - `forceAddMusd`: when true, `addMusd` and `addUsdc` always enable (loader path). Amount autofill for those intents stays on the dedicated 100% path in `useTransactionCustomAmount`.
 */
export function isMoneyAccountDepositPrefillEnabled({
  remotePrefillEnabled,
  abTestPrefillEnabled,
  intent,
  forceAddMusd = false,
}: {
  remotePrefillEnabled: boolean;
  abTestPrefillEnabled: boolean;
  intent?: MoneyAccountDepositIntent;
  forceAddMusd?: boolean;
}): boolean {
  if (intent === 'card') {
    return false;
  }

  if (forceAddMusd && isFullBalanceDepositIntent(intent)) {
    return true;
  }

  return remotePrefillEnabled && abTestPrefillEnabled;
}
