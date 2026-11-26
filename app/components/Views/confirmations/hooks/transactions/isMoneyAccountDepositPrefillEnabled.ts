import {
  isFullBalanceDepositIntent,
  type MoneyAccountDepositIntent,
} from '../../../../UI/Money/utils/moneyAccountDepositIntent';

/**
 * Shared enablement rule for Money Account deposit amount prefill / prefill loader.
 *
 * - `card` never prefills
 * - otherwise requires remote kill-switch AND A/B treatment (`prefillEnabled`)
 * - `forceFullBalanceIntent`: when true, full-balance intents always enable (loader path). Amount autofill for those intents stays on the dedicated 100% path in `useTransactionCustomAmount`.
 */
export function isMoneyAccountDepositPrefillEnabled({
  remotePrefillEnabled,
  abTestPrefillEnabled,
  intent,
  forceFullBalanceIntent = false,
}: {
  remotePrefillEnabled: boolean;
  abTestPrefillEnabled: boolean;
  intent?: MoneyAccountDepositIntent;
  forceFullBalanceIntent?: boolean;
}): boolean {
  if (intent === 'card') {
    return false;
  }

  if (forceFullBalanceIntent && isFullBalanceDepositIntent(intent)) {
    return true;
  }

  return remotePrefillEnabled && abTestPrefillEnabled;
}
