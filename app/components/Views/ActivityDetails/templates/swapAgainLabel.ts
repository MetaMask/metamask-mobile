import { strings } from '../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../util/activity-adapters';

type SwapFamilyType = Extract<
  ActivityListItem,
  {
    type:
      | 'swap'
      | 'swapIncomplete'
      | 'convert'
      | 'lendingDeposit'
      | 'lendingWithdrawal'
      | 'wrap'
      | 'unwrap';
  }
>['type'];

/**
 * Swap-family types whose CTA re-opens the swap view. Lending deposits and
 * withdrawals share the `SwapDetails` template but are deliberately excluded:
 * the swap view cannot repeat either action, so they get their own CTA (or
 * none) instead of a "Swap again" label.
 */
type SwapAgainType = Exclude<
  SwapFamilyType,
  'lendingDeposit' | 'lendingWithdrawal'
>;

/**
 * Transaction-type-specific verb for the "do it again" CTA on swap-family
 * details (the action opens the unified swap/bridge view seeded with the
 * original tokens). Never returns the generic "Do it again".
 */
export function getSwapAgainLabel(type: SwapAgainType): string {
  switch (type) {
    case 'convert':
      return strings('activity_details.convert_again');
    case 'wrap':
      return strings('activity_details.wrap_again');
    case 'unwrap':
      return strings('activity_details.unwrap_again');
    case 'swap':
    default:
      return strings('activity_details.swap_again');
  }
}
