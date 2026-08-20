import {
  RampsOrderStatus as Status,
  type RampsOrder,
  type RampsOrderStatus,
} from '@metamask/ramps-controller';
import { showV2OrderToast } from '../../../../../components/UI/Ramp/utils/v2OrderToast';

/**
 * Returns whether a controller-driven status notification should surface a toast.
 * PRECREATED stubs are resolved by background polling; in-flow screens already
 * toast on checkout/callback, so suppress global toasts for that transition.
 */
export function shouldShowOrderStatusToast(
  previousStatus: RampsOrderStatus,
  status: RampsOrderStatus,
): boolean {
  if (previousStatus === status) {
    return false;
  }

  if (previousStatus === Status.Precreated) {
    return false;
  }

  return true;
}

export function handleOrderStatusChangedForNotifications({
  order,
  previousStatus,
}: {
  order: RampsOrder;
  previousStatus: RampsOrderStatus;
}): void {
  if (!shouldShowOrderStatusToast(previousStatus, order.status)) {
    return;
  }

  showV2OrderToast({
    orderId: order.providerOrderId,
    cryptocurrency: order.cryptoCurrency?.symbol ?? 'crypto',
    cryptoAmount: order.cryptoAmount,
    status: order.status,
  });
}
