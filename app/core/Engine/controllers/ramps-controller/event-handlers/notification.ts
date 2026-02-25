import {
  type RampsOrder,
  type RampsOrderStatus,
  RampsOrderStatus as Status,
} from '@metamask/ramps-controller';
import NotificationManager from '../../../../NotificationManager';
import { strings } from '../../../../../../locales/i18n';

function getV2NotificationDetails(
  order: RampsOrder,
): { title: string; description: string; duration: number } | null {
  const cryptoSymbol = order.cryptoCurrency?.symbol ?? 'crypto';
  const amount = order.cryptoAmount ?? '';

  switch (order.status) {
    case Status.Completed:
      return {
        title: strings(
          'fiat_on_ramp_aggregator.notifications.purchase_completed_title',
          {
            amount,
            currency: cryptoSymbol,
          },
        ),
        description: strings(
          'fiat_on_ramp_aggregator.notifications.purchase_completed_description',
          {
            currency: cryptoSymbol,
          },
        ),
        duration: 5000,
      };

    case Status.Failed:
    case Status.IdExpired:
      return {
        title: strings(
          'fiat_on_ramp_aggregator.notifications.purchase_failed_title',
          {
            currency: cryptoSymbol,
          },
        ),
        description: strings(
          'fiat_on_ramp_aggregator.notifications.purchase_failed_description',
        ),
        duration: 5000,
      };

    case Status.Cancelled:
      return {
        title: strings(
          'fiat_on_ramp_aggregator.notifications.purchase_cancelled_title',
        ),
        description: strings(
          'fiat_on_ramp_aggregator.notifications.purchase_cancelled_description',
        ),
        duration: 5000,
      };

    default:
      return null;
  }
}

export function handleOrderStatusChanged({
  order,
}: {
  order: RampsOrder;
  previousStatus: RampsOrderStatus;
}): void {
  const details = getV2NotificationDetails(order);
  if (details) {
    NotificationManager.showSimpleNotification(details);
  }
}
