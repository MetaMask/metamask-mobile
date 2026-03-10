import { useMemo } from 'react';
import { type PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { formatDelayFromArray } from '../../../../UI/Ramp/Aggregator/utils';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { HighlightedItem } from '../../types/token';

/**
 * Converts available Ramps payment methods into {@link HighlightedItem}s for
 * the Pay-With modal. Returns `[]` when the fiat feature flag is off or no
 * payment methods are available. Selecting an item toggles
 * `fiatPayment.selectedPaymentMethodId` on the current transaction.
 */
export function useFiatPaymentHighlightedActions(): HighlightedItem[] {
  const { enabled } = useMMPayFiatConfig();
  const { paymentMethods } = useRampsPaymentMethods();
  const fiatPayment = useTransactionPayFiatPayment();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;

  return useMemo(() => {
    if (!enabled || paymentMethods.length === 0) {
      return [];
    }

    return paymentMethods.map((pm) =>
      toHighlightedItem(pm, transactionId, selectedPaymentMethodId),
    );
  }, [enabled, paymentMethods, transactionId, selectedPaymentMethodId]);
}

function toHighlightedItem(
  paymentMethod: PaymentMethod,
  transactionId: string,
  selectedPaymentMethodId?: string,
): HighlightedItem {
  const isSelected = paymentMethod.id === selectedPaymentMethodId;

  return {
    position: 'outside_of_asset_list',
    icon: paymentMethod.icon,
    paymentType: paymentMethod.paymentType,
    name: paymentMethod.name,
    name_description: paymentMethod.delay
      ? formatDelayFromArray(paymentMethod.delay)
      : '',
    action: () => {
      Engine.context.TransactionPayController.updateFiatPayment({
        transactionId,
        callback: (fiatPayment) => {
          fiatPayment.selectedPaymentMethodId = isSelected
            ? undefined
            : paymentMethod.id;
        },
      });
    },
    isSelected,
  };
}
