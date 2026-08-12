/**
 * Shared enablement rule for Money Account deposit amount prefill / prefill loader.
 *
 * - `card` never prefills
 * - otherwise requires remote kill-switch AND A/B treatment (`prefillEnabled`)
 * - `forceAddMusd`: when true, `addMusd` always enables (loader path). Amount autofill for addMusd stays on the dedicated 100% path in `useTransactionCustomAmount`.
 */
export function isMoneyAccountDepositPrefillEnabled({
  remotePrefillEnabled,
  abTestPrefillEnabled,
  intent,
  forceAddMusd = false,
}: {
  remotePrefillEnabled: boolean;
  abTestPrefillEnabled: boolean;
  intent?: 'convert' | 'addMusd' | 'card';
  forceAddMusd?: boolean;
}): boolean {
  if (intent === 'card') {
    return false;
  }

  if (forceAddMusd && intent === 'addMusd') {
    return true;
  }

  return remotePrefillEnabled && abTestPrefillEnabled;
}
