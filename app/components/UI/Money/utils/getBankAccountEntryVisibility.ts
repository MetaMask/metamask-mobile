import type { VbaEligibility } from '../../Ramp/Views/VirtualBankAccount/hooks/useVbaEligibility';

/**
 * How the Add funds Bank account row should render.
 *
 * - `enabled`: live row. An account already exists, or VBA eligibility passed.
 * - `coming-soon`: flag is off. Keeps the pre-rollout placeholder.
 * - `hidden`: flag is on, but the user is not eligible (or region still loading).
 */
export type BankAccountEntryVisibility = 'enabled' | 'coming-soon' | 'hidden';

/**
 * Maps VBA eligibility onto the Bank account row.
 *
 * @param inputs - Result of `useVbaEligibility()` plus whether the Money
 * account already has a usable autoramp.
 * @returns The row visibility for the Add funds sheet.
 */
export function getBankAccountEntryVisibility({
  isFlagEnabled,
  isEligible,
  hasUsableAutoramp,
}: Pick<VbaEligibility, 'isFlagEnabled' | 'isEligible'> & {
  hasUsableAutoramp: boolean;
}): BankAccountEntryVisibility {
  if (hasUsableAutoramp) {
    return 'enabled';
  }
  if (!isFlagEnabled) {
    return 'coming-soon';
  }
  return isEligible ? 'enabled' : 'hidden';
}
