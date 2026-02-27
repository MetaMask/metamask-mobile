import { useMemo } from 'react';
import { PaymentMethod } from '@metamask/ramps-controller';

import Engine from '../../../../../core/Engine';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { HighlightedItem } from '../../types/token';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useRampsController } from '../../../../UI/Ramp/hooks/useRampsController';
import { formatDelayFromArray } from '../../../../UI/Ramp/Aggregator/utils';

export function useFiatPaymentHighlightedActions(): HighlightedItem[] {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const { paymentMethods } = useRampsController();
  const fiatPayment = useTransactionPayFiatPayment();
  const selectedPaymentMethodId = fiatPayment?.selectedPaymentMethodId;

  return useMemo(() => {
    if (paymentMethods.length === 0) {
      return [];
    }

    return paymentMethods.map((paymentMethod: PaymentMethod) => ({
      position: 'outside_of_asset_list',
      icon: {
        type: 'payment',
        icon: paymentMethod.paymentType,
      },
      name: paymentMethod.name,
      name_description: deriveDelayDescription(paymentMethod),
      action: () => {
        Engine.context.TransactionPayController.updateFiatPayment({
          transactionId,
          selectedPaymentMethodId: paymentMethod.id,
        });
      },
      isSelected: selectedPaymentMethodId === paymentMethod.id,
      fiat: '',
      fiat_description: '',
    }));
  }, [paymentMethods, selectedPaymentMethodId, transactionId]);
}

function deriveDelayDescription(paymentMethod: PaymentMethod): string {
  if (!Array.isArray(paymentMethod.delay) || paymentMethod.delay.length < 2) {
    return paymentMethod.pendingOrderDescription ?? '';
  }

  return formatDelayFromArray(paymentMethod.delay);
}
