import { strings } from '../../../../../locales/i18n';
import type { ActivityListItem } from '../../../../util/activity-adapters';

/** Activity types routed to the `SwapDetails` template. Keep both lists in sync. */
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
 * The subset whose CTA re-opens the swap view. Lending in/out is excluded: the
 * swap view can't repeat either action, so they get their own CTA (or none).
 */
type SwapAgainType = Exclude<
  SwapFamilyType,
  'lendingDeposit' | 'lendingWithdrawal'
>;

/**
 * Type-specific verb for the "do it again" CTA, which opens the unified
 * swap/bridge view seeded with the original tokens. Never returns the generic
 * "Do it again".
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
