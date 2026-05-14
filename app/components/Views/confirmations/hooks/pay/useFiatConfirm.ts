import { useCallback } from 'react';
import { createProjectLogger } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import {
  useHeadlessBuy,
  type HeadlessBuyError,
} from '../../../../UI/Ramp/headless';
import type { TransactionFiatPayment } from '@metamask/transaction-pay-controller';
import type { Quote } from '../../../../UI/Ramp/types';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useConfirmationContext } from '../../context/confirmation-context';

const log = createProjectLogger('fiat-confirm');

type HeadlessFiatPayment = TransactionFiatPayment & {
  caipAssetId?: string;
};

export function useFiatConfirm() {
  const transactionMetadata = useTransactionMetadataRequest();
  const fiatPayment = useTransactionPayFiatPayment() as
    | HeadlessFiatPayment
    | undefined;
  const { setIsHeadlessBuyInProgress, setHeadlessBuyError } =
    useConfirmationContext();
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
    setHeadlessBuyError(undefined);

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
        onError: (error: HeadlessBuyError) => {
          setIsHeadlessBuyInProgress(false);
          setHeadlessBuyError(
            error.message ?? strings('alert_system.headless_buy_error.message'),
          );
        },
        onClose: () => {
          setIsHeadlessBuyInProgress(false);
          setHeadlessBuyError(undefined);
        },
      },
    );
  }, [
    fiatPayment,
    setHeadlessBuyError,
    setIsHeadlessBuyInProgress,
    startHeadlessBuy,
    transactionMetadata?.id,
  ]);

  return { onFiatConfirm, isFiatPaymentSelected, orderId };
}
