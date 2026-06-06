import { useCallback } from 'react';
import { createProjectLogger } from '@metamask/utils';
import { providerErrors } from '@metamask/rpc-errors';
import BigNumber from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import {
  useHeadlessBuy,
  type HeadlessBuyError,
} from '../../../../UI/Ramp/headless';
import type { Quote } from '../../../../UI/Ramp/types';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  useTransactionPayFiatPayment,
  useTransactionPayTotals,
} from './useTransactionPayData';

import { useConfirmationContext } from '../../context/confirmation-context';

const log = createProjectLogger('fiat-confirm');

export function useFiatConfirm() {
  const transactionMetadata = useTransactionMetadataRequest();
  const fiatPayment = useTransactionPayFiatPayment();
  const { setIsHeadlessBuyInProgress, setHeadlessBuyError } =
    useConfirmationContext();
  const { startHeadlessBuy } = useHeadlessBuy();
  const totals = useTransactionPayTotals();

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

    const transactionId = transactionMetadata?.id;

    // Subtract the on-ramp provider fee from the total so the Ramps order
    // amount covers exactly the Relay leg of the intent (fees + deposit).
    // The on-ramp provider adds its own fee on top of what we request.
    const totalAmountToBuy = new BigNumber(totals?.total?.usd ?? 0)
      .minus(new BigNumber(totals?.fees.providerFiat?.usd ?? 0))
      .toNumber();

    startHeadlessBuy(
      {
        quote: rampsQuote,
        assetId,
        amount: totalAmountToBuy,
        paymentMethodId: fiatPayment?.selectedPaymentMethodId,
        currency: 'USD',
      },
      {
        onOrderCreated: (orderIdFromCallback) => {
          if (!transactionId) {
            return;
          }
          Engine.context.TransactionPayController.updateFiatPayment({
            transactionId,
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
          // Reject the underlying confirmation transaction so the user can
          // start a fresh deposit without hitting the orphaned-transaction
          // guard in useConfirmNavigation.
          if (transactionId) {
            try {
              Engine.context.ApprovalController.rejectRequest(
                transactionId,
                providerErrors.userRejectedRequest(),
              );
            } catch {
              log(
                'Failed to reject transaction after headless buy error',
                transactionId,
              );
            }
          }
        },
        onClose: (info) => {
          setIsHeadlessBuyInProgress(false);
          setHeadlessBuyError(undefined);
          // Reject the underlying confirmation transaction on any non-completed
          // close (user dismissed the headless flow without completing the order).
          // Without this the tx stays `unapproved`, causing useConfirmNavigation
          // to defer — and then drop — the next deposit attempt when the sheet
          // unmounts before the deferral resolves.
          // `orderId` on fiatPayment means `onOrderCreated` already fired —
          // the order went through and the tx will be handled by the relay.
          const completed = Boolean(fiatPayment?.orderId);
          if (!completed && transactionId) {
            try {
              Engine.context.ApprovalController.rejectRequest(
                transactionId,
                providerErrors.userRejectedRequest(),
              );
            } catch {
              log(
                'Failed to reject transaction after headless buy close',
                transactionId,
              );
            }
          }
        },
      },
    );
  }, [
    fiatPayment,
    totals,
    setHeadlessBuyError,
    setIsHeadlessBuyInProgress,
    startHeadlessBuy,
    transactionMetadata?.id,
  ]);

  return { onFiatConfirm, isFiatPaymentSelected, orderId };
}
