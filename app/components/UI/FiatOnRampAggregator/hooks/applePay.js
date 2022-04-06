import { useCallback } from 'react';
import { PaymentRequest } from '@exodus/react-native-payments';

import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';

//* Payment Request */

const ABORTED = 'ABORTED';

//* Setup */
const applePaySetup = {
	getPurchaseFiatAmountWithoutFeeLabel(crypto) {
		return strings('fiat_on_ramp.wyre_purchase', { currency: crypto.symbol });
	},

	getPurchaseFiatFeeLabel() {
		return strings('fiat_on_ramp.Fee');
	},

	getPurchaseFiatTotalAmountLabel() {
		return strings('fiat_on_ramp.wyre_total_label');
	},
};

function useApplePay(quote) {
	const showRequest = useCallback(async () => {
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
			if (error.message.includes('AbortError')) {
				return ABORTED;
			}
			if (paymentRequest?.abort) {
				paymentRequest.abort();
			}
			Logger.error(error, { message: 'FiatOnRampAgg::ApplePay error while creating order' });
			throw error;
		}
	}, [quote]);

	return [showRequest, ABORTED];
}

export default useApplePay;
