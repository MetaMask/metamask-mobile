import { useCallback, useMemo, useState, useEffect } from 'react';
import { PaymentRequest } from '@exodus/react-native-payments';
import axios from 'axios';
import AppConstants from '../../../../core/AppConstants';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';

import useCurrency from '../../../Base/Keypad/useCurrency';
import { FIAT_ORDER_PROVIDERS, FIAT_ORDER_STATES } from '../../../../constants/on-ramp';

//* env vars

const WYRE_ACCOUNT_ID = process.env.WYRE_ACCOUNT_ID;
const WYRE_ACCOUNT_ID_TEST = process.env.WYRE_ACCOUNT_ID_TEST;

//* typedefs

/**
 * @typedef {import('../../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

/**
 * Wyre API errors.
 * Source: https://docs.sendwyre.com/docs/errors
 * @typedef WyreError
 * @property {string} exceptionId A unique identifier for this exception. This is very helpful when contacting support
 * @property {WYRE_ERROR_TYPE} type The category of the exception. See below
 * @property {string} errorCode A more granular specification than type
 * @property {string} message A human-friendly description of the problem
 * @property {string} language Indicates the language of the exception message
 * @property {boolean} transient In rare cases, an exception may signal true here to indicate a transient problem. This means the request can be safely re-attempted
 *
 */

/**
 * @enum {string}
 */
export const WYRE_ERROR_TYPE = {
	ValidationException: 'ValidationException', // The action failed due to problems with the request. 400
	InsufficientFundsException: 'InsufficientFundsException', // You requested the use of more funds in the specified currency than were available. 400
	AccessDeniedException: 'AccessDeniedException', // You lack sufficient privilege to perform the requested. action 401
	TransferException: 'TransferException', // There was a problem completing your transfer request. 400
	MFARequiredException: 'MFARequiredException', // An MFA action is required to complete the request. In general you should not get this exception while using API keys. 400
	CustomerSupportException: 'CustomerSupportException', // Please contact us at support@sendwyre.com to resolve this! 400
	NotFoundException: 'NotFoundException', // You referenced something that could not be located. 404
	RateLimitException: 'RateLimitException', // Your requests have exceeded your usage restrictions. Please contact us if you need this increased. 429
	AccountLockedException: 'AccountLockedException', // The account has had a locked placed on it for potential fraud reasons. The customer should contact Wyre support for follow-up. 400
	LockoutException: 'LockoutException', // The account or IP has been blocked due to detected malicious behavior. 403
	UnknownException: 'UnknownException', // A problem with our services internally. This should rarely happen. 500
};

/**
 * https://docs.sendwyre.com/docs/apple-pay-order-integration
 *
 * @typedef WyreOrder
 * @property {string} id Wallet order id eg: "WO_ELTUVYCAFPG"
 * @property {number} createdAt  Timestamp in UTC eg: 1576263687643
 * @property {string} owner Owner eg: "account:AC_RNWQNRAZFPC"
 * @property {WYRE_ORDER_STATES} status Order status eg: "PROCESSING",
 * @property {string?} transferId  Transfer id or null eg: "TF_MDA6MAY848D",
 * @property {number} sourceAmount Fiat amount of order eg: 1.84,
 * @property {string} sourceCurrency Fiat currency of order eg: "USD",
 * @property {string} destCurrency Crypto currency eg: "ETH",
 * @property {string} dest Destination of transfer eg: "ethereum:0x9E01E0E60dF079136a7a1d4ed97d709D5Fe3e341",
 * @property {string} walletType  Wallet type eg: "APPLE_PAY",
 * @property {string} email Customer email eg: "user@company.com",
 * @property {string?} errorMessage Error message null,
 * @property {string} accountId Account ID: "AC_RNWQNRAZFPC",
 * @property {string} paymentMethodName Display "Visa 2942"
 */

/**
 * https://docs.sendwyre.com/docs/wallet-order-processing
 * @enum {string}
 */
export const WYRE_ORDER_STATES = {
	RUNNING_CHECKS: 'RUNNING_CHECKS',
	FAILED: 'FAILED',
	PROCESSING: 'PROCESSING',
	COMPLETE: 'COMPLETE',
};

/**
 * @typedef WyreTransfer
 *
 * @property {string} transferId Transfer ID eg:"TF_MDA6MAY848D"
 * @property {string} feeCurrency Fee currency "USD"
 * @property {number} fee Fee
 * @property {object} fees Fees object
 * @property {number} fees.ETH Fees in ETH
 * @property {number} fees.USD Fees in USD
 * @property {string} sourceCurrency Source currency eg: "USD"
 * @property {string} destCurrency eg: "ETH"
 * @property {number} sourceAmount Source amount eg: 1.84
 * @property {number} destAmount Dest amount eg: 0.001985533306564713
 * @property {string} destSrn Destination address eg: "ethereum:0x9E01E0E60dF079136a7a1d4ed97d709D5Fe3e341"
 * @property {string} from eg: "Walletorderholding WO_ELTUVYCAFPG"
 * @property {string} to
 * @property {number} rate rate eg: 0.0019760479041916164
 * @property {string?} customId customId eg:null
 * @property {string} status status eg:COMPLETED
 * @property {string?} blockchainNetworkTx Transfer transaction hash
 * @property {string?} message
 * @property {string} transferHistoryEntryType eg: "OUTGOING"
 * @property {Array.<{statusDetail: string, state: string, createdAt: number}>} successTimeline
 * @property {Array.<{statusDetail: string, state: string, createdAt: number}>} failedTimeline
 * @property {string?} failureReason
 * @property {string?} reversalReason
 */

//* Constants */

const { WYRE_MERCHANT_ID, WYRE_MERCHANT_ID_TEST, WYRE_API_ENDPOINT, WYRE_API_ENDPOINT_TEST } = AppConstants.FIAT_ORDERS;
export const WYRE_IS_PROMOTION = false;
export const WYRE_REGULAR_FEE_PERCENT = 2.9;
export const WYRE_REGULAR_FEE_FLAT = 0.3;
export const WYRE_MIN_FEE = 5;
export const WYRE_FEE_PERCENT = WYRE_IS_PROMOTION ? 0 : WYRE_REGULAR_FEE_PERCENT;
export const WYRE_FEE_FLAT = WYRE_IS_PROMOTION ? 0 : WYRE_REGULAR_FEE_FLAT;
const ETH_CURRENCY_CODE = 'ETH';

export const SUPPORTED_COUNTRIES = {
	AU: {
		code: 'AU',
		currency: 'AUD',
		label: '🇦🇺',
		name: 'Australia',
	},
	AT: {
		code: 'AT',
		currency: 'EUR',
		label: '🇦🇹',
		name: 'Austria',
	},
	BE: {
		code: 'BE',
		currency: 'EUR',
		label: '🇧🇪',
		name: 'Belgium',
	},
	BR: {
		code: 'BR',
		currency: 'BRL',
		label: '🇧🇷',
		name: 'Brazil',
	},
	CA: {
		code: 'CA',
		currency: 'CAD',
		label: '🇨🇦',
		name: 'Canada',
	},
	CY: {
		code: 'CY',
		currency: 'EUR',
		label: '🇨🇾',
		name: 'Cyprus',
	},
	CZ: {
		code: 'CZ',
		currency: 'CZK',
		label: '🇨🇿',
		name: 'Czech Republic',
	},
	DK: {
		code: 'DK',
		currency: 'DKK',
		label: '🇩🇰',
		name: 'Denmark',
	},
	EE: {
		code: 'EE',
		currency: 'EUR',
		label: '🇪🇪',
		name: 'Estonia',
	},
	FI: {
		code: 'FI',
		currency: 'EUR',
		label: '🇫🇮',
		name: 'Finland',
	},
	FR: {
		code: 'FR',
		currency: 'EUR',
		label: '🇫🇷',
		name: 'France',
	},
	DE: {
		code: 'DE',
		currency: 'EUR',
		label: '🇩🇪',
		name: 'Germany',
	},
	GR: {
		code: 'GR',
		currency: 'EUR',
		label: '🇬🇷',
		name: 'Greece',
	},
	HK: {
		code: 'HK',
		currency: 'HKD',
		label: '🇭🇰',
		name: 'Hong Kong',
	},
	IS: {
		code: 'IS',
		currency: 'ISK',
		label: '🇮🇸',
		name: 'Iceland',
	},
	IE: {
		code: 'IE',
		currency: 'EUR',
		label: '🇮🇪',
		name: 'Ireland',
	},
	IT: {
		code: 'IT',
		currency: 'EUR',
		label: '🇮🇹',
		name: 'Italy',
	},
	JP: {
		code: 'JP',
		currency: 'JPY',
		label: '🇯🇵',
		name: 'Japan',
	},
	LV: {
		code: 'LV',
		currency: 'EUR',
		label: '🇱🇻',
		name: 'Latvia',
	},
	LT: {
		code: 'LT',
		currency: 'EUR',
		label: '🇱🇹',
		name: 'Lithuania',
	},
	LU: {
		code: 'LU',
		currency: 'EUR',
		label: '🇱🇺',
		name: 'Luxembourg',
	},
	NL: {
		code: 'NL',
		currency: 'EUR',
		label: '🇳🇱',
		name: 'Netherlands',
	},
	NZ: {
		code: 'NZ',
		currency: 'NZD',
		label: '🇳🇿',
		name: 'New Zealand',
	},
	NO: {
		code: 'NO',
		currency: 'NOK',
		label: '🇳🇴',
		name: 'Norway',
	},
	PL: {
		code: 'PL',
		currency: 'PLN',
		label: '🇵🇱',
		name: 'Poland',
	},
	PT: {
		code: 'PT',
		currency: 'EUR',
		label: '🇵🇹',
		name: 'Portugal',
	},
	SG: {
		code: 'SG',
		currency: 'SGD',
		label: '🇸🇬',
		name: 'Singapore',
	},
	SK: {
		code: 'SK',
		currency: 'EUR',
		label: '🇸🇰',
		name: 'Slovakia',
	},
	SI: {
		code: 'SI',
		currency: 'EUR',
		label: '🇸🇮',
		name: 'Slovenia',
	},
	ES: {
		code: 'ES',
		currency: 'EUR',
		label: '🇪🇸',
		name: 'Spain',
	},
	SE: {
		code: 'SE',
		currency: 'SEK',
		label: '🇸🇪',
		name: 'Sweden',
	},
	CH: {
		code: 'CH',
		currency: 'CHF',
		label: '🇨🇭',
		name: 'Switzerland',
	},
	GB: {
		code: 'GB',
		currency: 'GBP',
		label: '🇬🇧',
		name: 'United Kingdom',
	},
	US: {
		code: 'US',
		currency: 'USD',
		label: '🇺🇸',
		name: 'United States',
	},
};

const getMerchantIdentifier = (network) => (network === '1' ? WYRE_MERCHANT_ID : WYRE_MERCHANT_ID_TEST);
const getPartnerId = (network) => (network === '1' ? WYRE_ACCOUNT_ID : WYRE_ACCOUNT_ID_TEST);

//* API */

const wyreAPI = axios.create({
	baseURL: WYRE_API_ENDPOINT,
});

const wyreTestAPI = axios.create({
	baseURL: WYRE_API_ENDPOINT_TEST,
});

const getWyreAPI = (network) => (network === '1' ? wyreAPI : wyreTestAPI);

const getRates = (network) => getWyreAPI(network).get(`v3/rates`, { params: { as: 'PRICED' } });
const createFiatOrder = (network, payload) =>
	getWyreAPI(network).post('v3/apple-pay/process/partner', payload, {
		// * This promise will always be resolved, use response.status to handle errors
		validateStatus: (status) => status >= 200,
		// * Apple Pay timeouts at ~30s without throwing error, we want to catch that before and throw
		timeout: 25000,
	});
const getOrderStatus = (network, orderId) => getWyreAPI(network).get(`v3/orders/${orderId}`);
const getTransferStatus = (network, transferId) => getWyreAPI(network).get(`v2/transfer/${transferId}/track`);
export const getOrderQuotation = (network, { amount, currency, address, country = 'US' }, cancelToken) =>
	getWyreAPI(network).post(
		`v3/orders/quote/partner`,
		{
			sourceAmount: amount,
			amountIncludeFees: false,
			sourceCurrency: currency,
			destCurrency: ETH_CURRENCY_CODE,
			dest: `ethereum:${address}`,
			accountId: getPartnerId(network),
			country,
			walletType: 'APPLE_PAY',
		},
		{ cancelToken }
	);

//* Helpers

const destToAddress = (dest) => (dest.indexOf('ethereum:') === 0 ? dest.substring(9) : dest);

export class WyreException extends Error {
	/**
	 * Creates a WyreException based on a WyreError
	 * @param {string} message
	 * @param {WYRE_ERROR_TYPE} type
	 * @param {string} exceptionId
	 */
	constructor(message, type, exceptionId) {
		super(message);
		this.type = type;
		this.id = exceptionId;
	}
}

/**
 * Transforms a WyreOrder state into a FiatOrder state
 * @param {WYRE_ORDER_STATES} wyreOrderState
 */
const wyreOrderStateToFiatState = (wyreOrderState) => {
	switch (wyreOrderState) {
		case WYRE_ORDER_STATES.COMPLETE: {
			return FIAT_ORDER_STATES.COMPLETED;
		}
		case WYRE_ORDER_STATES.FAILED: {
			return FIAT_ORDER_STATES.FAILED;
		}
		case WYRE_ORDER_STATES.RUNNING_CHECKS:
		case WYRE_ORDER_STATES.PROCESSING:
		default: {
			return FIAT_ORDER_STATES.PENDING;
		}
	}
};

/**
 * Transforms Wyre order object into a Fiat order object used in the state.
 * @param {WyreOrder} wyreOrder Wyre order object
 * @returns {FiatOrder} Fiat order object to store in the state
 */
const wyreOrderToFiatOrder = (wyreOrder) => ({
	id: wyreOrder.id,
	provider: FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY,
	createdAt: wyreOrder.createdAt,
	amount: wyreOrder.sourceAmount,
	fee: null,
	cryptoAmount: null,
	cryptoFee: null,
	currency: wyreOrder.sourceCurrency,
	cryptocurrency: wyreOrder.destCurrency,
	state: wyreOrderStateToFiatState(wyreOrder.status),
	account: destToAddress(wyreOrder.dest),
	txHash: null,
	data: {
		order: wyreOrder,
	},
});

/**
 * Returns fields present in a WyreTransfer which are not
 * present in a WyreOrder to be assigned in a FiatOrder
 * @param {WyreTransfer} wyreTransfer Wyre transfer object
 * @returns {FiatOrder} Partial fiat order object to store in the state
 */
const wyreTransferToFiatOrder = (wyreTransfer) => ({
	fee: wyreTransfer.fee,
	cryptoAmount: wyreTransfer.destAmount,
	cryptoFee: wyreTransfer.fees ? wyreTransfer.fees[wyreTransfer.destCurrency] : null,
	txHash: wyreTransfer.blockchainNetworkTx,
});

//* Handlers

export async function processWyreApplePayOrder(order) {
	try {
		const { data } = await getOrderStatus(order.network, order.id);
		if (!data) {
			Logger.error('FiatOrders::WyreApplePayProcessor empty data', order);
			return order;
		}

		const { transferId } = data;

		if (transferId) {
			try {
				const transferResponse = await getTransferStatus(order.network, transferId);
				if (transferResponse.data) {
					return {
						...order,
						...wyreOrderToFiatOrder(data),
						...wyreTransferToFiatOrder(transferResponse.data),
						data: {
							order: data,
							transfer: transferResponse.data,
						},
					};
				}
			} catch (error) {
				Logger.error(error, {
					message: 'FiatOrders::WyreApplePayProcessor error while processing transfer',
					order,
				});
			}
		}

		return {
			...order,
			...wyreOrderToFiatOrder(data),
		};
	} catch (error) {
		Logger.error(error, { message: 'FiatOrders::WyreApplePayProcessor error while processing order', order });
		return order;
	}
}

//* Payment Request */

const ABORTED = 'ABORTED';

const PAYMENT_REQUEST_COMPLETE = {
	SUCCESS: 'success',
	UNKNOWN: 'unknown',
	FAIL: 'fail',
};

const getMethodData = (currency, network) => [
	{
		supportedMethods: ['apple-pay'],
		data: {
			countryCode: 'US',
			currencyCode: currency,
			supportedNetworks: ['visa', 'mastercard', 'discover'],
			merchantIdentifier: getMerchantIdentifier(network),
		},
	},
];

const getPaymentDetails = (cryptoCurrency, currency, amount, fee, total) => ({
	displayItems: [
		{
			amount: { currency, value: `${amount}` },
			label: strings('fiat_on_ramp.wyre_purchase', { currency: cryptoCurrency }),
		},
		{
			amount: { currency, value: `${fee}` },
			label: strings('fiat_on_ramp.Fee'),
		},
	],
	total: {
		amount: { currency, value: `${total}` },
		label: strings('fiat_on_ramp.wyre_total_label'),
	},
});

const paymentOptions = {
	requestPayerPhone: true,
	requestPayerEmail: true,
	requestBilling: true,
	merchantCapabilities: ['debit'],
};

const createPayload = (network, amount, address, currency, paymentDetails) => {
	const {
		billingContact: { postalAddress, name },
		paymentData,
		paymentMethod,
		shippingContact,
		transactionIdentifier,
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
		subLocality: postalAddress.subLocality,
	};

	const formattedShippingContact = {
		...formattedBillingContact,
		emailAddress: shippingContact.emailAddress,
		phoneNumber: shippingContact.phoneNumber,
	};

	const partnerId = getPartnerId(network);

	return {
		partnerId,
		payload: {
			orderRequest: {
				amount,
				dest,
				destCurrency: ETH_CURRENCY_CODE,
				referrerAccountId: partnerId,
				sourceCurrency: currency,
			},
			paymentObject: {
				billingContact: formattedBillingContact,
				shippingContact: formattedShippingContact,
				token: {
					paymentData,
					paymentMethod: {
						...paymentMethod,
						type: 'debit',
					},
					transactionIdentifier,
				},
			},
		},
	};
};

// * Hooks */

export function useCountryCurrency(country) {
	const currency = useMemo(() => SUPPORTED_COUNTRIES[country]?.currency, [country]);
	return {
		...useCurrency(currency),
		currency,
	};
}

export function useWyreRates(network, currencies) {
	const [rates, setRates] = useState([]);
	useEffect(() => {
		let cancelTokenSource;
		async function getWyreRates() {
			try {
				cancelTokenSource = axios.CancelToken.source();
				setRates([]);
				const { data } = await getRates(network);
				const rates = [];
				currencies.forEach((pair) => {
					if (pair.length % 2 === 0 && pair.slice(0, pair.length / 2) === pair.slice(pair.length / 2)) {
						rates.push({ [pair.slice(pair.length / 2)]: 1 });
					} else {
						rates.push(data[pair]);
					}
				});

				setRates(rates);
			} catch (error) {
				setRates([]);
				Logger.error(error, 'FiatOrders::WyreAppleyPay error while fetching wyre rates');
			}
		}
		getWyreRates();
		return () => {
			cancelTokenSource?.cancel();
		};
	}, [network, currencies]);

	return rates;
}

export function useWyreOrderQuotation(network, amount, currency, address, country, getQuote, delay) {
	const [isLoading, setIsLoading] = useState(false);
	const [quotation, setQuotation] = useState(null);
	useEffect(() => {
		let cancelTokenSource;
		(async () => {
			if (getQuote) {
				try {
					cancelTokenSource = axios.CancelToken.source();
					setIsLoading(true);
					setQuotation(null);
					await new Promise((resolve) => setTimeout(resolve, delay));
					const { data: quotation } = await getOrderQuotation(
						network,
						{
							amount,
							currency,
							address,
							country,
						},
						cancelTokenSource.token
					);
					setQuotation(quotation);
					setIsLoading(false);
				} catch (error) {
					setQuotation(null);
					setIsLoading(false);
				}
			} else {
				setIsLoading(false);
				setQuotation(null);
			}
		})();
		return () => {
			cancelTokenSource?.cancel();
			setQuotation(null);
			setIsLoading(false);
		};
	}, [network, amount, currency, address, country, getQuote, delay]);

	return [isLoading, quotation];
}

export function useWyreApplePay(address, currency, network) {
	const showRequest = useCallback(
		async (amount, fee, decimals) => {
			const fixedAmount = Number(amount).toFixed(decimals);
			const fixedFee = Number(fee).toFixed(decimals);
			const total = (Number(amount) + Number(fee)).toFixed(decimals);
			const methodData = getMethodData(currency, network);
			const paymentDetails = getPaymentDetails(ETH_CURRENCY_CODE, currency, fixedAmount, fixedFee, total);
			const paymentRequest = new PaymentRequest(methodData, paymentDetails, paymentOptions);
			try {
				const paymentResponse = await paymentRequest.show();
				if (!paymentResponse) {
					throw new Error('Payment Request Failed: empty apple pay response');
				}
				const payload = createPayload(network, total, address, currency, paymentResponse.details);
				const { data, status } = await createFiatOrder(network, payload);
				if (status >= 200 && status < 300) {
					paymentResponse.complete(PAYMENT_REQUEST_COMPLETE.SUCCESS);
					return { ...wyreOrderToFiatOrder(data), network };
				}
				paymentResponse.complete(PAYMENT_REQUEST_COMPLETE.FAIL);
				throw new WyreException(data.message, data.type, data.exceptionId);
			} catch (error) {
				if (error.message.includes('AbortError')) {
					return ABORTED;
				}
				if (paymentRequest && paymentRequest.abort) {
					paymentRequest.abort();
				}
				Logger.error(error, { message: 'FiatOrders::WyreApplePayPayment error while creating order' });
				throw error;
			}
		},
		[address, currency, network]
	);

	return [showRequest, ABORTED];
}

export function useWyreTerms(navigation) {
	const handleWyreTerms = useCallback(
		() =>
			navigation.navigate('Webview', {
				screen: 'SimpleWebview',
				params: {
					url: 'https://www.sendwyre.com/user-agreement/',
					title: strings('fiat_on_ramp.wyre_user_agreement'),
				},
			}),
		[navigation]
	);
	return handleWyreTerms;
}
