import {
	WYRE_API_ENDPOINT,
	WYRE_API_ENDPOINT_TEST,
	WYRE_ACCOUNT_ID,
	WYRE_ACCOUNT_ID_TEST,
	WYRE_MERCHANT_ID,
	WYRE_MERCHANT_ID_TEST
} from 'react-native-dotenv';
import { useCallback, useMemo } from 'react';
import { PaymentRequest } from 'react-native-payments';
import axios from 'axios';

// {
// 	id: <original provider id> // Orders are identified by (provider, id)
// 	provider: FIAT_PROVIDER,
// 	amount: 0.343
// 	fee: 0.3,
// 	currency: "USD"
// 	state: FIAT_ORDER_STATE
// 	account: <account wallet address>
// 	network: <network>
// 	txHash: <transaction hash | null>
// 	data: <original provider data>
// }

//* typedefs

/**
 * @typedef {import('../../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

//* Constants */

const isDevelopment = process.env.NODE_ENV !== 'production';
const merchantIdentifier = 'test' || isDevelopment ? WYRE_MERCHANT_ID_TEST : WYRE_MERCHANT_ID;
const partnerId = isDevelopment ? WYRE_ACCOUNT_ID_TEST : WYRE_ACCOUNT_ID;

export const WYRE_IS_PROMOTION = true;
export const WYRE_FEE_PERCENT = WYRE_IS_PROMOTION ? 0 : 2.9;
export const WYRE_FEE_FLAT = WYRE_IS_PROMOTION ? 0 : 0.3;

//* API */

const wyreAPI = axios.create({
	baseURL: isDevelopment ? WYRE_API_ENDPOINT_TEST : WYRE_API_ENDPOINT
});

const createFiatOrder = payload =>
	wyreAPI.post('v3/apple-pay/process/partner', payload, {
		// * This promise will always be resolved, use response.status to handle errors
		validateStatus: status => status >= 200
	});
const trackFiatOrder = orderId => wyreAPI.get(`v3/orders/${orderId}`);
const trackTransfer = transferId => wyreAPI.get(`v2/transfer/${transferId}/track`);

export function processWyreApplePayOrder(order) {
	console.log('processWyreApplePayOrder');

	/* TODO: Once the transferId is returned it means order was
	accepted and the transfer (blockchain transaction) is in progress.
	To track its progress please check the transfer tracking documentation here https://docs.sendwyre.com/v3/docs/track-wallet-order
	*/

	return order;
}

//* Payment Request */

const USD_CURRENCY_CODE = 'USD';
const ETH_CURRENCY_CODE = 'ETH';

const PAYMENT_REQUEST_COMPLETE = {
	SUCCESS: 'success',
	UNKNOWN: 'unknown',
	FAIL: 'fail'
};

const methodData = [
	{
		supportedMethods: ['apple-pay'],
		supportedTypes: ['debit'],
		data: {
			countryCode: 'US',
			currencyCode: USD_CURRENCY_CODE,
			supportedNetworks: ['visa', 'mastercard', 'discover'],
			merchantIdentifier
		}
	}
];

const getPaymentDetails = (cryptoCurrency, amount, fee, total) => ({
	displayItems: [
		{
			amount: { currency: USD_CURRENCY_CODE, value: `${amount}` },
			label: `${cryptoCurrency} Purchase`
		},
		{
			amount: { currency: USD_CURRENCY_CODE, value: `${fee}` },
			label: 'Fee'
		}
	],
	total: {
		amount: { currency: USD_CURRENCY_CODE, value: `${total}` },
		label: 'Wyre'
	}
});

const paymentOptions = {
	requestPayerPhone: true,
	requestPayerEmail: true,
	requestBilling: true
};

const createPayload = (amount, address, paymentDetails) => {
	const {
		billingContact: { postalAddress, name },
		paymentData,
		paymentMethod,
		shippingContact,
		transactionIdentifier
	} = paymentDetails;
	const dest = `ethereum:${address}`;

	const formattedBillingContact = {
		addressLines: postalAddress.street.split('\n'),
		administrativeArea: postalAddress.state,
		country: postalAddress.country,
		countryCode: postalAddress.ISOCountryCode,
		familyName: name.familyName,
		givenName: name.givenName,
		locality: postalAddress.city,
		postalCode: postalAddress.postalCode,
		subAdministrativeArea: postalAddress.subAdministrativeArea,
		subLocality: postalAddress.subLocality
	};

	const formattedShippingContact = {
		...formattedBillingContact,
		emailAddress: shippingContact.emailAddress,
		phoneNumber: shippingContact.phoneNumber
	};

	return {
		partnerId,
		payload: {
			orderRequest: {
				amount,
				dest,
				destCurrency: ETH_CURRENCY_CODE,
				referrerAccountId: partnerId,
				sourceCurrency: USD_CURRENCY_CODE
			},
			paymentObject: {
				billingContact: formattedBillingContact,
				shippingContact: formattedShippingContact,
				token: {
					paymentData,
					paymentMethod: {
						...paymentMethod,
						type: 'debit'
					},
					transactionIdentifier
				}
			}
		}
	};
};

// * Hooks */

export function useWyreApplePay(amount, address) {
	const flatFee = useMemo(() => WYRE_FEE_FLAT.toFixed(2), []);
	const percentFee = useMemo(() => WYRE_FEE_PERCENT.toFixed(2), []);
	const percentFeeAmount = useMemo(() => ((Number(amount) * Number(percentFee)) / 100).toFixed(2), [
		amount,
		percentFee
	]);
	const fee = useMemo(() => (Number(percentFeeAmount) + Number(flatFee)).toFixed(2), [flatFee, percentFeeAmount]);
	const total = useMemo(() => Number(amount) + Number(fee), [amount, fee]);
	const paymentDetails = useMemo(() => getPaymentDetails(ETH_CURRENCY_CODE, amount, fee, total), [
		amount,
		fee,
		total
	]);

	const showRequest = useCallback(async () => {
		const paymentRequest = new PaymentRequest(methodData, paymentDetails, paymentOptions);
		try {
			const paymentResponse = await paymentRequest.show();
			if (!paymentResponse) {
				throw new Error('Payment Request Failed');
			}
			const payload = createPayload(total, address, paymentResponse.details);
			await axios.post('https://envwmfqc4hgr.x.pipedream.net/payment', payload);
			const { data, status } = await createFiatOrder(payload);

			if (status >= 200 && status < 300) {
				console.log('success');
				await paymentResponse.complete(PAYMENT_REQUEST_COMPLETE.SUCCESS);
				// TODO: transform into FiatOrder
				return data;
			}
			paymentResponse.complete(PAYMENT_REQUEST_COMPLETE.FAIL);
			console.log(data);

			// {"compositeType": "", "exceptionId": "RBV6BR", "language": "en", "message": "No partner configuration found or AC_Q9X8G3WGTDH", "subType": "", "transient": false, "type": "ApiException"}

			throw data;
		} catch (error) {
			if (error.message.includes('AbortError')) {
				return console.log('aborted');
			}

			paymentRequest.abort();

			console.log('Error in payment request: ', error);
		}
	}, [address, paymentDetails, total]);

	return [showRequest, percentFee, flatFee, percentFeeAmount, fee, total];
}

export function useWyreTerms(navigation) {
	const handleWyreTerms = useCallback(
		() =>
			navigation.navigate('Webview', {
				url: 'https://www.sendwyre.com/user-agreement/',
				title: 'Wyre User Agreement'
			}),
		[navigation]
	);
	return handleWyreTerms;
}
