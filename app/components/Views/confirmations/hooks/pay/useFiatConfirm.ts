import { useCallback } from 'react';
import { createProjectLogger } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import {
  useHeadlessBuy,
  type HeadlessBuyError,
} from '../../../../UI/Ramp/headless';
import type { Quote } from '../../../../UI/Ramp/types';
import {
  RAMP_SURFACE,
  type RampSurface,
} from '../../../../UI/Ramp/types/depositAnalytics';
import Engine from '../../../../../core/Engine';
import { getTransactionPayFiatTestOptions } from '../../../../../util/environment';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  useTransactionPayFiatPayment,
  useTransactionPayTotals,
} from './useTransactionPayData';

import { useConfirmationContext } from '../../context/confirmation-context';

const log = createProjectLogger('fiat-confirm');
const FIAT_TEST_FUNDING_SOURCE_ORDER_ID = 'fiat-test-funding-source';

/**
 * Maps a confirmation transaction type to the headless ramps `ramp_surface`
 * (TRAM-3623). Only deposit flows routed through the headless buy belong here.
 * `musdConversion` and withdraw types are intentionally omitted: not
 * money/perps/prediction deposits, so they get an `undefined` surface.
 */
const TRANSACTION_TYPE_TO_RAMP_SURFACE: Partial<
  Record<TransactionType, RampSurface>
> = {
  [TransactionType.moneyAccountDeposit]: RAMP_SURFACE.MONEY_ACCOUNT,
  [TransactionType.perpsDeposit]: RAMP_SURFACE.PERPS,
  [TransactionType.predictDeposit]: RAMP_SURFACE.PREDICTION,
};

export function useFiatConfirm() {
  const transactionMetadata = useTransactionMetadataRequest();
  const fiatPayment = useTransactionPayFiatPayment();
  const { setIsHeadlessBuyInProgress, setHeadlessBuyError } =
    useConfirmationContext();
  const { startHeadlessBuy } = useHeadlessBuy();
  const totals = useTransactionPayTotals();

  const isFiatPaymentSelected = Boolean(fiatPayment?.selectedPaymentMethodId);
  const orderId = fiatPayment?.orderId as string | undefined;
  const fiatTestOptions = getTransactionPayFiatTestOptions();

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

    setHeadlessBuyError(undefined);

    if (fiatTestOptions?.testFundingSource) {
      setIsHeadlessBuyInProgress(false);

      if (!transactionMetadata?.id) {
        log('Fiat test funding source missing transaction metadata');
        return;
      }

      Engine.context.TransactionPayController.updateFiatPayment({
        transactionId: transactionMetadata.id,
        callback: (fp) => {
          fp.orderId = FIAT_TEST_FUNDING_SOURCE_ORDER_ID;
        },
      });

      return;
    }

    setIsHeadlessBuyInProgress(true);

    // Subtract the on-ramp provider fee from the total so the Ramps order
    // amount covers exactly the Relay leg of the intent (fees + deposit).
    // The on-ramp provider adds its own fee on top of what we request.
    const totalAmountToBuy = new BigNumber(totals?.total?.usd ?? 0)
      .minus(new BigNumber(totals?.fees.providerFiat?.usd ?? 0))
      .toNumber();

    const rampSurface = transactionMetadata?.type
      ? TRANSACTION_TYPE_TO_RAMP_SURFACE[transactionMetadata.type]
      : undefined;

    startHeadlessBuy(
      {
        quote: rampsQuote,
        assetId,
        amount: totalAmountToBuy,
        paymentMethodId: fiatPayment?.selectedPaymentMethodId,
        currency: 'USD',
        walletAddress: transactionMetadata?.txParams?.from,
        rampSurface,
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
    fiatTestOptions?.testFundingSource,
    fiatPayment,
    totals,
    setHeadlessBuyError,
    setIsHeadlessBuyInProgress,
    startHeadlessBuy,
    transactionMetadata?.id,
    transactionMetadata?.txParams?.from,
    transactionMetadata?.type,
  ]);

  return { onFiatConfirm, isFiatPaymentSelected, orderId };
}
