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

/**
 * Order and status pairs already toasted in this app session.
 *
 * The controller republishes `orderStatusChanged` on every poll when it cannot
 * persist a fetched status for a stored order (TRAM-4452), so the transition
 * check above is not enough on its own to keep a settled order from toasting
 * again.
 */
const toastedOrderStatuses = new Set<string>();

/** Clears the once-per-session toast record. Tests only. */
export function resetToastedOrderStatuses(): void {
  toastedOrderStatuses.clear();
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

  const toastKey = `${order.providerOrderId}:${order.status}`;
  if (toastedOrderStatuses.has(toastKey)) {
    return;
  }
  toastedOrderStatuses.add(toastKey);

  showV2OrderToast({
    orderId: order.providerOrderId,
    cryptocurrency: order.cryptoCurrency?.symbol ?? 'crypto',
    cryptoAmount: order.cryptoAmount,
    status: order.status,
  });
}
