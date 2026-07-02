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
 * Transaction-type-specific verb for the "do it again" CTA on swap-family
 * details (the action opens the unified swap/bridge view seeded with the
 * original tokens). Lending in/out falls back to "Swap again" since the action
 * routes through the swap view. Never returns the generic "Do it again".
 */
export function getSwapAgainLabel(type: SwapFamilyType): string {
  switch (type) {
    case 'convert':
      return strings('activity_details.convert_again');
    case 'wrap':
      return strings('activity_details.wrap_again');
    case 'unwrap':
      return strings('activity_details.unwrap_again');
    case 'swap':
    case 'lendingDeposit':
    case 'lendingWithdrawal':
    default:
      return strings('activity_details.swap_again');
  }
}
