import { useMemo } from 'react';
import { type PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { formatDelayFromArray } from '../../../../UI/Ramp/Aggregator/utils';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { HighlightedItem } from '../../types/token';
import { hasTransactionType } from '../../utils/transaction';

/**
 * Converts available Ramps payment methods into {@link HighlightedItem}s for
 * the Pay-With modal. Returns `[]` when the fiat feature flag is off or no
 * payment methods are available. Selecting an item toggles
 * `fiatPayment.selectedPaymentMethodId` on the current transaction.
 */
export function useFiatPaymentHighlightedActions(): HighlightedItem[] {
  const { enabledTransactionTypes, maxDelayMinutesForPaymentMethods } =
    useMMPayFiatConfig();
  const { paymentMethods } = useRampsPaymentMethods();
  const fiatPayment = useTransactionPayFiatPayment();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;
  const isFiatEnabled = hasTransactionType(
    transactionMeta,
    enabledTransactionTypes,
  );

  return useMemo(() => {
    if (!isFiatEnabled || paymentMethods.length === 0) {
      return [];
    }

    return paymentMethods
      .filter((pm) => isWithinDelayLimit(pm, maxDelayMinutesForPaymentMethods))
      .map((pm) =>
        toHighlightedItem(pm, transactionId, selectedPaymentMethodId),
      );
  }, [
    isFiatEnabled,
    maxDelayMinutesForPaymentMethods,
    paymentMethods,
    transactionId,
    selectedPaymentMethodId,
  ]);
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

function isWithinDelayLimit(
  pm: PaymentMethod,
  maxDelayMinutesForPaymentMethods: number,
): boolean {
  return !pm.delay || pm.delay[1] <= maxDelayMinutesForPaymentMethods;
}
