/**
 * Shared enablement rule for Money Account deposit amount prefill / prefill loader.
 *
 * - `card` never prefills
 * - `addMusd` always prefills
 * - otherwise requires remote kill-switch AND A/B treatment (`prefillEnabled`)
 */
export function isMoneyAccountDepositPrefillEnabled({
  remotePrefillEnabled,
  abTestPrefillEnabled,
  intent,
}: {
  remotePrefillEnabled: boolean;
  abTestPrefillEnabled: boolean;
  intent?: 'convert' | 'addMusd' | 'card';
}): boolean {
  if (intent === 'card') {
    return false;
  }

  return (remotePrefillEnabled && abTestPrefillEnabled) || intent === 'addMusd';
}
