import { useCallback } from 'react';
// @ts-expect-error ts(7016) react-native-payments is not typed
import { PaymentRequest } from '@exodus/react-native-payments';

import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { CryptoCurrency, QuoteResponse } from '@consensys/on-ramp-sdk';

//* Payment Request */

export const ABORTED = 'ABORTED';

//* Setup */
const applePaySetup = {
	getPurchaseFiatAmountWithoutFeeLabel(crypto: CryptoCurrency) {
		return strings('fiat_on_ramp.wyre_purchase', { currency: crypto.symbol });
	},

	getPurchaseFiatFeeLabel() {
		return strings('fiat_on_ramp.Fee');
	},

	getPurchaseFiatTotalAmountLabel() {
		return strings('fiat_on_ramp.wyre_total_label');
	},
};

function useApplePay(quote: QuoteResponse) {
	const showRequest = useCallback(async () => {
		if (!quote.getApplePayRequestInfo || !quote.purchaseWithApplePay) {
			throw new Error('Quote does not support Apple Pay');
		}

		const applePayInfo = quote.getApplePayRequestInfo(applePaySetup);
		const paymentRequest = new PaymentRequest(
			applePayInfo.methodData,
			applePayInfo.paymentDetails,
			applePayInfo.paymentOptions
		);
		try {
			const paymentResponse = await paymentRequest.show();
			if (!paymentResponse) {
				throw new Error('Payment Request Failed: empty apple pay response');
			}

			const purchaseResult = await quote.purchaseWithApplePay(paymentResponse);

			if (purchaseResult.success) {
				return purchaseResult.order;
			}

			throw new Error(purchaseResult.error);
		} catch (error) {
			if ((error as Error).message.includes('AbortError')) {
				return ABORTED;
			}
			if (paymentRequest?.abort) {
				paymentRequest.abort();
			}
			Logger.error(error as Error, { message: 'FiatOnRampAgg::ApplePay error while creating order' });
			throw error;
		}
	}, [quote]);

	return [showRequest, ABORTED];
}

export default useApplePay;
