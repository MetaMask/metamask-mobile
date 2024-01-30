import { useCallback } from 'react';
// @ts-expect-error ts(7016) react-native-payments is not typed
import { PaymentRequest } from '@exodus/react-native-payments';

import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { CryptoCurrency, QuoteResponse } from '@consensys/on-ramp-sdk';
import {
  ApplePayPurchaseStatus,
  IApplePaySetup,
} from '@consensys/on-ramp-sdk/dist/ApplePay';

//* Payment Request */

export const ABORTED = 'ABORTED';
enum PAYMENT_REQUEST_COMPLETE {
  SUCCESS = 'success',
  UNKNOWN = 'unknown',
  FAIL = 'fail',
}

//* Setup */
function createApplePaySetup(quote: QuoteResponse): IApplePaySetup {
  return {
    getPurchaseFiatAmountWithoutFeeLabel(crypto: CryptoCurrency) {
      return strings('fiat_on_ramp.apple_pay_purchase', {
        currency: crypto.symbol,
      });
    },

    getPurchaseFiatFeeLabel() {
      return strings('fiat_on_ramp.Fee');
    },

    getPurchaseFiatTotalAmountLabel() {
      return strings('fiat_on_ramp.apple_pay_provider_total_label', {
        provider: quote.provider.name,
      });
    },
  };
}

function useApplePay(quote: QuoteResponse) {
  const showRequest = useCallback(async () => {
    if (!quote.getApplePayRequestInfo || !quote.purchaseWithApplePay) {
      throw new Error('Quote does not support Apple Pay');
    }

    const applePaySetup = createApplePaySetup(quote);
    const applePayInfo = quote.getApplePayRequestInfo(applePaySetup);
    const paymentRequest = new PaymentRequest(
      applePayInfo.methodData,
      applePayInfo.paymentDetails,
      applePayInfo.paymentOptions,
    );
    try {
      const paymentResponse = await paymentRequest.show();
      if (!paymentResponse) {
        throw new Error('Payment Request Failed: empty apple pay response');
      }

      const purchaseResult = await quote.purchaseWithApplePay(
        paymentResponse.details,
      );

      switch (purchaseResult.status) {
        case ApplePayPurchaseStatus.FAILURE: {
          paymentResponse.complete(PAYMENT_REQUEST_COMPLETE.FAIL);
          if (purchaseResult.error?.message) {
            throw purchaseResult.error;
          } else {
            throw new Error(purchaseResult.error);
          }
        }
        case ApplePayPurchaseStatus.SUCCESS:
        case ApplePayPurchaseStatus.PENDING: {
          paymentResponse.complete(PAYMENT_REQUEST_COMPLETE.SUCCESS);
          return {
            order: purchaseResult.order,
            authenticationUrl: purchaseResult.authenticationUrl,
          };
        }
      }
    } catch (error) {
      if ((error as Error).message.includes('AbortError')) {
        return ABORTED;
      }
      if (paymentRequest?.abort) {
        paymentRequest.abort();
      }
      Logger.error(error as Error, {
        message: 'FiatOnRampAgg::ApplePay error while creating order',
      });
      throw error;
    }
  }, [quote]);

  return [showRequest];
}

export default useApplePay;
