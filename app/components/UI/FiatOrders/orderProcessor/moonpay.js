import axios from 'axios';
import qs from 'query-string';
import { FIAT_ORDER_PROVIDERS, FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import AppConstants from '../../../../core/AppConstants';
import Logger from '../../../../util/Logger';

//* env vars

const MOONPAY_API_KEY_STAGING = process.env.MOONPAY_API_KEY_STAGING;
const MOONPAY_API_KEY_PRODUCTION = process.env.MOONPAY_API_KEY_PRODUCTION;

//* typedefs

/**
 * @typedef {import('../../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

/**
 * https://www.moonpay.com/dashboard/api_reference/client_side_api#transaction_object
 *
 * @typedef MoonPayTransaction
 * @property {string} id Unique identifier for the object.
 * @property {string} createdAt Time at which the object was created. Returned as an ISO 8601 string.
 * @property {string} updatedAt  Time at which the object was last updated. Returned as an ISO 8601 string.
 * @property {number} baseCurrencyAmount  A positive integer representing how much the customer wants to spend. The minimum amount is 20.
 * @property {number} quoteCurrencyAmount A positive integer representing the amount of cryptocurrency the customer will receive. Set when the purchase of cryptocurrency has been executed.
 * @property {number} feeAmount A positive integer representing the fee for the transaction. It is added to baseCurrencyAmount, extraFeeAmount and networkFeeAmount when the customer's card is charged.
 * @property {number} extraFeeAmount A positive integer representing your extra fee for the transaction. It is added to baseCurrencyAmount and feeAmount when the customer's card is charged.
 * @property {number} networkFeeAmount A positive integer representing the network fee for the transaction. It is added to baseCurrencyAmount, feeAmount and extraFeeAmount when the customer's card is charged.
 * @property {boolean} areFeesIncluded A boolean indicating whether baseCurrencyAmount includes or excludes the feeAmount, extraFeeAmount and networkFeeAmount.
 * @property {string} status The transaction's status. Possible values are waitingPayment, pending, waitingAuthorization, failed or completed.
 * @property {string} failureReason The transaction's failure reason. Set when transaction's status is failed.
 * @property {string} walletAddress The cryptocurrency wallet address the purchased funds will be sent to.
 * @property {string} walletAddressTag The secondary cryptocurrency wallet address identifier for coins such as EOS, XRP and XMR.
 * @property {string} cryptoTransactionId The cryptocurrency transaction identifier representing the transfer to the customer's wallet. Set when the withdrawal has been executed.
 * @property {string} redirectUrl The URL provided to you, when required, to which to redirect the customer as part of a redirect authentication flow.
 * @property {string} returnUrl The URL the customer is returned to after they authenticate or cancel their payment on the payment method’s app or site. If you are using our widget implementation, this is always our transaction tracker page, which provides the customer with real-time information about their transaction.
 * @property {string} widgetRedirectUrl An optional URL used in a widget implementation. It is passed to us by you in the query parameters, and we include it as a link on the transaction tracker page.
 * @property {number} eurRate The exchange rate between the transaction's base currency and Euro at the time of the transaction.
 * @property {number} usdRate The exchange rate between the transaction's base currency and US Dollar at the time of the transaction.
 * @property {number} gbpRate The exchange rate between the transaction's base currency and British Pound at the time of the transaction.
 * @property {object} bankDepositInformation For bank transfer transactions, the information about our bank account to which the customer should make the transfer.
 * @property {string} bankTransferReference For bank transfer transactions, the reference code the customer should cite when making the transfer.
 * @property {string} currencyId The identifier of the cryptocurrency the customer wants to purchase.
 * @property {string} baseCurrencyId The identifier of the fiat currency the customer wants to use for the transaction.
 * @property {string} customerId The identifier of the customer the transaction is associated with.
 * @property {string} cardId For token or card transactions, the identifier of the payment card used for this transaction.
 * @property {string} bankAccountId For bank transfer transactions, the identifier of the bank account used for this transaction.
 * @property {string} externalCustomerId An identifier associated with the customer, provided by you.
 * @property {string} externalTransactionId An identifier associated with the transaction, provided by you.
 * @property {string} country The customer's country. Returned as an ISO 3166-1 alpha-3 code.
 * @property {string} state The customer's state, if the customer is from the USA. Returned as a two-letter code.
 * @property {array} stages An array of four objects, each representing one of the four stages of the purchase process. The attributes of each stage are described below.
 * @property {string} stage[stage] Possible values are stage_one_ordering, stage_two_verification, stage_three_processing, stage_four_delivery.
 * @property {string} stage[status] Possible values are not_started, in_progress, success, failed.
 * @property {string} stage[failureReason] Possible values are card_not_supported, daily_purchase_limit_exceeded, payment_authorization_declined, timeout_3d_secure, timeout_bank_transfer, timeout_kyc_verification, timeout_card_verification, rejected_kyc, rejected_card, rejected_other, cancelled, refund, failed_testnet_withdrawal, error. It can also be null.
 * @property {array} stage[actions] Sometimes, the customer is required to take an action or actions to further the purchase process, usually by submitting information at a provided URL. For each action, we pass an object with a type and a url. Possible types are complete_bank_transfer, retry_kyc, verify_card_by_code, verify_card_by_file. If no actions are required, this returns an empty array.
 */

/**
 * https://www.moonpay.com/dashboard/api_reference/client_side_api#transaction_object
 * @enum {string}
 */
const MOONPAY_TRANSACTION_STATES = {
	WAITING_PAYMENT: 'waitingPayment',
	PENDING: 'pending',
	WAITING_AUTHORIZATION: 'waitingAuthorization',
	FAILED: 'failed',
	COMPLETED: 'completed',
};

/**
 * Query params added by MoonPay when redirecting after completing flow
 * https://www.moonpay.com/dashboard/getting_started/
 * @typedef MoonPayRedirectTransaction
 * @type {object}
 * @property {string} transactionId
 * @property {string} transactionStatus
 */

//* Constants

const {
	//MOONPAY_URL, MOONPAY_URL_STAGING,
	MOONPAY_API_URL_PRODUCTION,
	MOONPAY_REDIRECT_URL,
} = AppConstants.FIAT_ORDERS;

const isDevelopment = process.env.NODE_ENV !== 'production';

const MOONPAY_API_BASE_URL = isDevelopment ? MOONPAY_API_URL_PRODUCTION : MOONPAY_API_URL_PRODUCTION;
const MOONPAY_API_KEY = isDevelopment ? MOONPAY_API_KEY_STAGING : MOONPAY_API_KEY_PRODUCTION;

//* API

const moonPayApi = axios.create({
	baseURL: MOONPAY_API_BASE_URL,
});

const getOrderStatus = (transactionId) =>
	moonPayApi.get('v1/transactions', {
		params: {
			apiKey: MOONPAY_API_KEY,
			transactionId,
		},
	});

const getCurrencies = moonPayApi.get('v3/currencies', {
	params: {
		apiKey: MOONPAY_API_KEY,
	},
});

// TODO: post values to sign

//* Helpers

/**
 * Transforms a MoonPayTransaction state into a FiatOrder state
 * @param {MOONPAY_TRANSACTION_STATES} moonPayOrderState
 */
const moonPayOrderToFiatOrderState = (moonPayOrderState) => {
	switch (moonPayOrderState) {
		case MOONPAY_TRANSACTION_STATES.WAITING_PAYMENT:
		case MOONPAY_TRANSACTION_STATES.PENDING:
		case MOONPAY_TRANSACTION_STATES.WAITING_AUTHORIZATION: {
			return FIAT_ORDER_STATES.PENDING;
		}
		case MOONPAY_TRANSACTION_STATES.FAILED: {
			return FIAT_ORDER_STATES.FAILED;
		}
		case MOONPAY_TRANSACTION_STATES.COMPLETED: {
			return FIAT_ORDER_STATES.COMPLETED;
		}
		default: {
			return FIAT_ORDER_STATES.PENDING;
		}
	}
};

/**
 * Transforms Wyre order object into a Fiat order object used in the state.
 * @param {MoonPayTransaction} moonPayTransaction MoonPay transaction object
 * @returns {FiatOrder} Fiat order object to store in the state
 */
const moonPayOrderToFiatOrder = (moonPayTransaction) => ({
	id: moonPayTransaction.id,
	provider: FIAT_ORDER_PROVIDERS.MOONPAY,
	createdAt: new Date(moonPayTransaction.createdAt).getTime(),
	amount: moonPayTransaction.baseCurrencyAmount,
	fee: moonPayTransaction.feeAmount + moonPayTransaction.extraFeeAmount + moonPayTransaction.networkFeeAmount,
	cryptoAmount: moonPayTransaction.quoteCurrencyAmount,
	cryptoFee: moonPayTransaction.networkFeeAmount,
	currency: '',
	cryptocurrency: '',
	amountInUSD: moonPayTransaction.baseCurrencyAmount * moonPayTransaction.usdRate,
	state: moonPayOrderToFiatOrderState(moonPayTransaction.status),
	account: moonPayTransaction.walletAddress,
	txHash: null,
	data: moonPayTransaction,
});

/**
 * Transforms MoonPay redirect object into a Fiat order object used in the state.
 * @param {MoonPayRedirectTransaction} moonPayRedirectObject MoonPay redirect object
 * @returns {FiatOrder} Fiat order object to store in the state
 */
const moonPayCallbackOrderToFiatOrder = (moonPayRedirectObject) => ({
	id: moonPayRedirectObject.transactionId,
	provider: FIAT_ORDER_PROVIDERS.MOONPAY,
	createdAt: Date.now(),
	amount: 0,
	fee: null,
	currency: '',
	cryptoAmount: null,
	cryptocurrency: '',
	state: moonPayOrderToFiatOrderState(moonPayRedirectObject.status),
	data: null,
});

//* Handlers

/**
 * Function to handle Transak flow redirect after order creation
 * @param {String} url Custom URL with query params MoonPay flow redirected to.
 * 	Query parameters are: `transactionId`, `transactionStatus`.
 * @param {String} network Current network selected in the app
 * @param {String} account Current account selected in the app
 * @returns {FiatOrder}
 */
export const handleMoonPayRedirect = (url, network, account) => {
	/** @type {MoonPayRedirectTransaction} */
	const data = qs.parse(url.split(MOONPAY_REDIRECT_URL)[1]);
	const order = { ...moonPayCallbackOrderToFiatOrder(data), network, account };
	return order;
};

/**
 * Function used to poll and update the order
 * @param {FiatOrder} order Order coming from the state
 * @param {MoonPayTransaction} order.data Original Moonpay transanction
 * @returns {FiatOrder} Fiat order to update in the state
 */
export async function processMoonPayOrder(order) {
	try {
		const { data } = await getOrderStatus(order.id);

		if (!data) {
			Logger.error('FiatOrders::MoonPayProcessor empty data', order);
			return order;
		}

		const updatedOrder = {
			...order,
			...moonPayOrderToFiatOrder(data),
		};

		if (!updatedOrder.currency || !updatedOrder.cryptocurrency) {
			const { data: currencies } = await getCurrencies();
			const currency = currencies.find(({ id }) => id === data.baseCurrencyId);
			const cryptocurrency = currencies.find(({ id }) => id === data.currencyId);
			updatedOrder.currency = currency?.code;
			updatedOrder.cryptocurrency = cryptocurrency?.code;
		}

		return updatedOrder;
	} catch (error) {
		Logger.error(error, { message: 'FiatOrders::MoonPayProcessor error while processing order', order });
		return order;
	}
}

// TODO: create useMoonPayFlowURL hook, including signature of the URL#search object
