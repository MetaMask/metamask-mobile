import { useMemo } from 'react';
import { type PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { formatDelayFromArray } from '../../../../UI/Ramp/Aggregator/utils';
import {
  getFiatFunnelRampSurface,
  useFiatPaymentSelectorMetrics,
} from '../../../../UI/Ramp/hooks/useFiatFunnelMetrics';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useIsFiatPaymentAvailable } from './useIsFiatPaymentAvailable';
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
  const { maxDelayMinutesForPaymentMethods } = useMMPayFiatConfig();
  const { paymentMethods } = useRampsPaymentMethods();
  const fiatPayment = useTransactionPayFiatPayment();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;
  const isFiatAvailable = useIsFiatPaymentAvailable();

  useFiatPaymentSelectorMetrics({
    rampSurface: getFiatFunnelRampSurface(transactionMeta?.type),
    currentPaymentMethodId: selectedPaymentMethodId,
  });

  return useMemo(() => {
    if (!isFiatAvailable) {
      return [];
    }

    return paymentMethods
      .filter((pm) => isWithinDelayLimit(pm, maxDelayMinutesForPaymentMethods))
      .map((pm) =>
        toHighlightedItem(pm, transactionId, selectedPaymentMethodId),
      );
  }, [
    isFiatAvailable,
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
