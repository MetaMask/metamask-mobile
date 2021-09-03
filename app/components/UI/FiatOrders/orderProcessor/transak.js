import { useMemo } from 'react';
import axios from 'axios';
import qs from 'query-string';
import AppConstants from '../../../../core/AppConstants';
import Logger from '../../../../util/Logger';
import { FIAT_ORDER_PROVIDERS, FIAT_ORDER_STATES } from '../../../../constants/on-ramp';

//* env vars

const TRANSAK_API_KEY_STAGING = process.env.TRANSAK_API_KEY_STAGING;
const TRANSAK_API_KEY_SECRET_STAGING = process.env.TRANSAK_API_KEY_SECRET_STAGING;
const TRANSAK_API_KEY_PRODUCTION = process.env.TRANSAK_API_KEY_PRODUCTION;
const TRANSAK_API_KEY_SECRET_PRODUCTION = process.env.TRANSAK_API_KEY_SECRET_PRODUCTION;

//* typedefs

/**
 * @typedef {import('../../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

/**
 * https://transak.stoplight.io/docs/transak-docs/1.swagger.yaml/paths/~1partners~1order~1%7BorderId%7D/get
 * @typedef TransakOrder
 * @type {object}
 * @property {string} id
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} completedAt
 * @property {string} fiatCurrency
 * @property {string} cryptoCurrency
 * @property {number} fiatAmount
 * @property {number} fiatAmountInUsd
 * @property {string} walletLink
 * @property {string} paymentOptionId Paymenth method ID, see: https://integrate.transak.com/Coverage-Payment-Methods-Fees-Limits-30c0954fbdf04beca68622d9734c59f9
 * @property {boolean} addressAdditionalData
 * @property {string} network this is NOT ethernet networks id
 * @property {string} amountPaid
 * @property {number} referenceCode
 * @property {string} redirectURL Our redirect URL
 * @property {number} conversionPrice
 * @property {number} cryptoAmount
 * @property {number} totalFeeInCrypto
 * @property {number} totalFeeInFiat
 * @property {array} paymentOption
 * @property {TRANSAK_ORDER_STATES} status
 * @property {string} walletAddress
 * @property {string} autoExpiresAt
 * @property {string} fromWalletAddress
 * @property {string} transactionHash
 * @property {string} transactionLink
 */

/**
 * Query params added by Transak when redirecting after completing flow
 * https://integrate.transak.com/Query-Parameters-9ec523df3b874ec58cef4fa3a906f238?p=d3edbf3a682d403daceee3249e8aea49
 * @typedef TransakRedirectOrder
 * @type {object}
 * @property {string} orderId
 * @property {string} fiatCurrency
 * @property {string} cryptoCurrency
 * @property {string} fiatAmount
 * @property {string} cryptoAmount
 * @property {string} isBuyOrSell
 * @property {string} status
 * @property {string} walletAddress
 * @property {string} totalFee
 * @property {string} partnerCustomerId
 * @property {string} partnerOrderId
 */

//* Constants

const { TRANSAK_URL, TRANSAK_URL_STAGING, TRANSAK_API_URL_STAGING, TRANSAK_API_URL_PRODUCTION, TRANSAK_REDIRECT_URL } =
	AppConstants.FIAT_ORDERS;

const isDevelopment = process.env.NODE_ENV !== 'production';

const TRANSAK_API_BASE_URL = `${isDevelopment ? TRANSAK_API_URL_STAGING : TRANSAK_API_URL_PRODUCTION}api/v2/`;
const TRANSAK_API_KEY = isDevelopment ? TRANSAK_API_KEY_STAGING : TRANSAK_API_KEY_PRODUCTION;
const TRANSAK_API_KEY_SECRET = isDevelopment ? TRANSAK_API_KEY_SECRET_STAGING : TRANSAK_API_KEY_SECRET_PRODUCTION;

/**
 * https://integrate.transak.com/69a2474c8d8d40daa04bd5bbe804fb6d?v=48a0c9fd98854078a4eaf5ec9a0a4f65
 * @enum {string}
 */
export const TRANSAK_ORDER_STATES = {
	AWAITING_PAYMENT_FROM_USER: 'AWAITING_PAYMENT_FROM_USER',
	PAYMENT_DONE_MARKED_BY_USER: 'PAYMENT_DONE_MARKED_BY_USER',
	PROCESSING: 'PROCESSING',
	PENDING_DELIVERY_FROM_TRANSAK: 'PENDING_DELIVERY_FROM_TRANSAK',
	COMPLETED: 'COMPLETED',
	EXPIRED: 'EXPIRED',
	FAILED: 'FAILED',
	CANCELLED: 'CANCELLED',
};

//* API

const transakApi = axios.create({
	baseURL: TRANSAK_API_BASE_URL,
});

// const getPartnerStatus = () => transakApi.get(`partners/${TRANSAK_API_KEY}`);
const getOrderStatus = (orderId) =>
	transakApi.get(`partners/order/${orderId}`, { params: { partnerAPISecret: TRANSAK_API_KEY_SECRET } });

//* Helpers

/**
 * Transforms a TransakOrder state into a FiatOrder state
 * @param {TRANSAK_ORDER_STATES} transakOrderState
 */
const transakOrderStateToFiatOrderState = (transakOrderState) => {
	switch (transakOrderState) {
		case TRANSAK_ORDER_STATES.COMPLETED: {
			return FIAT_ORDER_STATES.COMPLETED;
		}
		case TRANSAK_ORDER_STATES.EXPIRED:
		case TRANSAK_ORDER_STATES.FAILED: {
			return FIAT_ORDER_STATES.FAILED;
		}
		case TRANSAK_ORDER_STATES.CANCELLED: {
			return FIAT_ORDER_STATES.CANCELLED;
		}
		case TRANSAK_ORDER_STATES.AWAITING_PAYMENT_FROM_USER:
		case TRANSAK_ORDER_STATES.PAYMENT_DONE_MARKED_BY_USER:
		case TRANSAK_ORDER_STATES.PROCESSING:
		case TRANSAK_ORDER_STATES.PENDING_DELIVERY_FROM_TRANSAK:
		default: {
			return FIAT_ORDER_STATES.PENDING;
		}
	}
};

/**
 * Transforms Transak order object into a Fiat order object used in the state.
 * @param {TransakOrder} transakOrder Transak order object
 * @returns {FiatOrder} Fiat order object to store in the state
 */
const transakOrderToFiatOrder = (transakOrder) => ({
	id: transakOrder.id,
	provider: FIAT_ORDER_PROVIDERS.TRANSAK,
	createdAt: new Date(transakOrder.createdAt).getTime(),
	amount: transakOrder.fiatAmount,
	fee: transakOrder.totalFeeInFiat,
	cryptoAmount: transakOrder.cryptoAmount,
	cryptoFee: transakOrder.totalFeeInCrypto,
	currency: transakOrder.fiatCurrency,
	cryptocurrency: transakOrder.cryptoCurrency,
	amountInUSD: transakOrder.fiatAmountInUsd,
	state: transakOrderStateToFiatOrderState(transakOrder.status),
	account: transakOrder.walletAddress,
	txHash: transakOrder.transactionHash || null,
	data: transakOrder,
});

/**
 * Transforms Transak order object into a Fiat order object used in the state.
 * @param {TransakRedirectOrder} transakRedirectOrder Transak order object
 * @returns {FiatOrder} Fiat order object to store in the state
 */
const transakCallbackOrderToFiatOrder = (transakRedirectOrder) => ({
	id: transakRedirectOrder.orderId,
	provider: FIAT_ORDER_PROVIDERS.TRANSAK,
	createdAt: Date.now(),
	amount: Number(transakRedirectOrder.fiatAmount),
	fee: Number(transakRedirectOrder.totalFee),
	currency: transakRedirectOrder.fiatCurrency,
	cryptoAmount: transakRedirectOrder.cryptoAmount,
	cryptocurrency: transakRedirectOrder.cryptoCurrency,
	state: transakOrderStateToFiatOrderState(transakRedirectOrder.status),
	account: transakRedirectOrder.walletAddress,
	data: transakRedirectOrder,
});

//* Handlers

/**
 * Function to handle Transak flow redirect after order creation
 * @param {String} url Custom URL with query params transak flow redirected to.
 * Query parameters are: `orderId`, `fiatCurrency`, `cryptoCurrency`, `fiatAmount`,
 * `cryptoAmount`, `isBuyOrSell`, `status`, `walletAddress`,
 * `totalFee`, `partnerCustomerId`, `partnerOrderId`.
 * @param {String} network Current network selected in the app
 * @returns {FiatOrder}
 */
export const handleTransakRedirect = (url, network) => {
	/** @type {TransakRedirectOrder} */
	const data = qs.parse(url.split(TRANSAK_REDIRECT_URL)[1]);
	const order = { ...transakCallbackOrderToFiatOrder(data), network };
	return order;
};

/**
 * Function used to poll and update the order
 * @param {FiatOrder} order Order coming from the state
 * @param {TransakOrder} order.data Original Transak order
 * @returns {FiatOrder} Fiat order to update in the state
 */
export async function processTransakOrder(order) {
	try {
		const {
			data: { response },
		} = await getOrderStatus(order.id);
		if (!response) {
			throw new Error('Payment Request Failed: empty transak response');
		}
		return {
			...order,
			...transakOrderToFiatOrder(response),
		};
	} catch (error) {
		Logger.error(error, { message: 'FiatOrders::TransakProcessor error while processing order', order });
		return order;
	}
}

//* Hooks

export const useTransakFlowURL = (address) => {
	const params = useMemo(
		() =>
			qs.stringify({
				apiKey: TRANSAK_API_KEY,
				cryptoCurrencyCode: 'ETH',
				networks: 'ethereum',
				themeColor: '037dd6',
				walletAddress: address,
				redirectURL: TRANSAK_REDIRECT_URL,
			}),
		[address]
	);
	return `${isDevelopment ? TRANSAK_URL_STAGING : TRANSAK_URL}?${params}`;
};
