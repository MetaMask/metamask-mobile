import type { VbaEligibility } from '../../Ramp/Views/VirtualBankAccount/hooks/useVbaEligibility';

/**
 * How the Add funds Bank account row should render.
 *
 * - `enabled`: live row. An account already exists, or VBA eligibility passed.
 * - `coming-soon`: no account and not eligible, including people outside every market.
 * - `hidden`: no account, the flag is on, and the region lookup is still loading.
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
  isLoading,
  hasUsableAutoramp,
}: Pick<VbaEligibility, 'isFlagEnabled' | 'isEligible' | 'isLoading'> & {
  hasUsableAutoramp: boolean;
}): BankAccountEntryVisibility {
  if (hasUsableAutoramp || (isFlagEnabled && isEligible)) {
    return 'enabled';
  }
  if (isFlagEnabled && isLoading) {
    return 'hidden';
  }
  return 'coming-soon';
}
