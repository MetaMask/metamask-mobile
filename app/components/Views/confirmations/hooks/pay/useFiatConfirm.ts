import { useCallback } from 'react';
import { createProjectLogger } from '@metamask/utils';
import { useHeadlessBuy } from '../../../../UI/Ramp/headless';
import type { Quote } from '../../../../UI/Ramp/types';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useConfirmationContext } from '../../context/confirmation-context';

const log = createProjectLogger('fiat-confirm');

export function useFiatConfirm() {
  const transactionMetadata = useTransactionMetadataRequest();
  const fiatPayment = useTransactionPayFiatPayment();
  const { setIsHeadlessBuyInProgress } = useConfirmationContext();
  const { startHeadlessBuy } = useHeadlessBuy();

  const isFiatPaymentSelected = Boolean(fiatPayment?.selectedPaymentMethodId);
  const orderId = fiatPayment?.orderId as string | undefined;

  const onFiatConfirm = useCallback(() => {
    const rampsQuote = fiatPayment?.rampsQuote as Quote | undefined;
    const assetId = fiatPayment?.caipAssetId as string | undefined;
    const amountFiat = Number(fiatPayment?.amountFiat);

    if (!rampsQuote || !assetId || !amountFiat) {
      log('Fiat payment missing required data', {
        hasQuote: Boolean(rampsQuote),
        assetId,
        amountFiat,
      });
      return;
    }

    setIsHeadlessBuyInProgress(true);

    startHeadlessBuy(
      {
        quote: rampsQuote,
        assetId,
        amount: amountFiat,
        paymentMethodId: fiatPayment?.selectedPaymentMethodId,
        currency: 'USD',
      },
      {
        onOrderCreated: (orderIdFromCallback) => {
          if (!transactionMetadata?.id) {
            return;
          }
          Engine.context.TransactionPayController.updateFiatPayment({
            transactionId: transactionMetadata.id,
            callback: (fp) => {
              fp.orderId = orderIdFromCallback;
            },
          });
        },
        onError: () => {
          setIsHeadlessBuyInProgress(false);
        },
        onClose: () => {
          setIsHeadlessBuyInProgress(false);
        },
      },
    );
  }, [
    fiatPayment,
    setIsHeadlessBuyInProgress,
    startHeadlessBuy,
    transactionMetadata?.id,
  ]);

  return { onFiatConfirm, isFiatPaymentSelected, orderId };
}
