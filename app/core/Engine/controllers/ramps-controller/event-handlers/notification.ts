import {
  type RampsOrder,
  type RampsOrderStatus,
} from '@metamask/ramps-controller';
import { showV2OrderToast } from '../../../../../components/UI/Ramp/utils/v2OrderToast';

export function handleOrderStatusChangedForNotifications({
  order,
}: {
  order: RampsOrder;
  previousStatus: RampsOrderStatus;
}): void {
  showV2OrderToast({
    orderId: order.providerOrderId,
    cryptocurrency: order.cryptoCurrency?.symbol ?? 'crypto',
    cryptoAmount: order.cryptoAmount,
    status: order.status,
  });
}
