import type { VbaEligibility } from '../../Ramp/Views/VirtualBankAccount/hooks/useVbaEligibility';

/**
 * How the Add funds Bank account row should render.
 *
 * - `enabled`: live row. VBA eligibility passed.
 * - `coming-soon`: flag is off. Keeps the pre-rollout placeholder.
 * - `hidden`: flag is on, but the user is not eligible (or region still loading).
 */
export type BankAccountEntryVisibility = 'enabled' | 'coming-soon' | 'hidden';

/**
 * Maps VBA eligibility onto the Bank account row.
 *
 * @param eligibility - Result of `useVbaEligibility()`.
 * @returns The row visibility for the Add funds sheet.
 */
export function getBankAccountEntryVisibility({
  isFlagEnabled,
  isEligible,
}: Pick<
  VbaEligibility,
  'isFlagEnabled' | 'isEligible'
>): BankAccountEntryVisibility {
  if (!isFlagEnabled) {
    return 'coming-soon';
  }
  return isEligible ? 'enabled' : 'hidden';
}
