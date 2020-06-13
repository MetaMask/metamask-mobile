import { useMemo } from 'react';
import axios from 'axios';
import qs from 'query-string';
import {
	TRANSAK_URL,
	TRANSAK_URL_STAGING,
	TRANSAK_API_URL_STAGING,
	TRANSAK_API_URL_PRODUCTION,
	TRANSAK_API_KEY_STAGING,
	TRANSAK_API_KEY_SECRET_STAGING,
	TRANSAK_API_KEY_PRODUCTION,
	TRANSAK_API_KEY_SECRET_PRODUCTION
} from 'react-native-dotenv';
import { FIAT_ORDER_PROVIDERS, FIAT_ORDER_STATES } from '../../../../reducers/fiatOrders';
// import Logger from '../../../../util/Logger';

//* typedefs

/**
 * @typedef {import('../../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

/**
 * @typedef TransakOrder
 * @type {object}
 * @property {string} id
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} completedAt
 * @property {string} fiatCurrency
 * @property {string} cryptocurrency
 * @property {number} fiatAmount
 * @property {string} walletLink
 * @property {string} paymentOptionId
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
 * @property {} orderId
 * @property {} fiatCurrency
 * @property {} cryptocurrency
 * @property {} fiatAmount
 * @property {} cryptoAmount
 * @property {} isBuyOrSell
 * @property {} status
 * @property {} walletAddress
 * @property {} totalFee
 * @property {} partnerCustomerId
 * @property {} partnerOrderId
 */

//* Constants

const isDevelopment = process.env.NODE_ENV !== 'production';

export const TRANSAK_REDIRECT_URL = 'https://metamask.io/';

const TRANSAK_API_BASE_URL = `${isDevelopment ? TRANSAK_API_URL_STAGING : TRANSAK_API_URL_PRODUCTION}api/v1/`;
const TRANSAK_API_KEY = isDevelopment ? TRANSAK_API_KEY_STAGING : TRANSAK_API_KEY_PRODUCTION;
const TRANSAK_API_KEY_SECRET = isDevelopment ? TRANSAK_API_KEY_SECRET_STAGING : TRANSAK_API_KEY_SECRET_PRODUCTION;

/**
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
	CANCELLED: 'CANCELLED'
};

//* API

const transakApi = axios.create({
	baseURL: TRANSAK_API_BASE_URL
});

// eslint-disable-next-line no-unused-vars
const getPartnerStatus = () => transakApi.get(`partners/${TRANSAK_API_KEY}`);
const getOrderStatus = orderId =>
	transakApi.get(`partners/order/${orderId}`, { params: { partnerAPISecret: TRANSAK_API_KEY_SECRET } });

//* Helpers

/**
 * Transforms a Transak order state into a fiat order state
 * @param {TRANSAK_ORDER_STATES} transakOrderState
 */
const transakOrderStateToFiatOrderState = transakOrderState => {
	switch (transakOrderState) {
		case TRANSAK_ORDER_STATES.AWAITING_PAYMENT_FROM_USER:
		case TRANSAK_ORDER_STATES.PAYMENT_DONE_MARKED_BY_USER:
		case TRANSAK_ORDER_STATES.PROCESSING:
		case TRANSAK_ORDER_STATES.PENDING_DELIVERY_FROM_TRANSAK: {
			return FIAT_ORDER_STATES.PENDING;
		}
		case TRANSAK_ORDER_STATES.COMPLETED: {
			return FIAT_ORDER_STATES.COMPLETED;
		}
		case TRANSAK_ORDER_STATES.EXPIRED:
		case TRANSAK_ORDER_STATES.FAILED:
		case TRANSAK_ORDER_STATES.CANCELLED: {
			return FIAT_ORDER_STATES.CANCELLED;
		}
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
const transakOrderToFiatOrder = transakOrder => ({
	id: transakOrder.id,
	provider: FIAT_ORDER_PROVIDERS.TRANSAK,
	amount: transakOrder.fiatAmount,
	fee: transakOrder.totalFeeInFiat,
	cryptoAmount: transakOrder.cryptoAmount,
	cryptoFee: transakOrder.totalFeeInCrypto,
	currency: transakOrder.fiatCurrency,
	cryptocurrency: transakOrder.cryptocurrency,
	state: transakOrderStateToFiatOrderState(transakOrder.status),
	account: transakOrder.walletAddress,
	txHash: transakOrder.transactionHash || null,
	data: transakOrder
});

/**
 * Transforms Transak rorder object into a Fiat order object used in the state.
 * @param {TransakRedirectOrder} transakRedirectOrder Transak order object
 * @returns {FiatOrder} Fiat order object to store in the state
 */
const transakCallbackOrderToFiatOrder = transakRedirectOrder => ({
	id: transakRedirectOrder.orderId,
	provider: FIAT_ORDER_PROVIDERS.TRANSAK,
	amount: transakRedirectOrder.fiatAmount,
	fee: transakRedirectOrder.totalFee,
	currency: transakRedirectOrder.fiatCurrency,
	state: transakOrderStateToFiatOrderState(transakRedirectOrder.status),
	account: transakRedirectOrder.walletAddress,
	data: transakRedirectOrder
});

//* Handlers

/**
 * Function to handle Transak flow redirect after order creation
 * @param {String} url Custom URL with query params transak flow redirected to.
 * Query parameters are: `orderId`, `fiatCurrency`, `cryptocurrency`, `fiatAmount`,
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
			data: { response }
		} = await getOrderStatus(order.id);
		if (!response) {
			return order;
		}
		return {
			...order,
			...transakOrderToFiatOrder(response)
		};
	} catch (error) {
		console.error(error);
		return order;
	}
}

//* Hooks

export const useTransakFlowURL = address => {
	const params = useMemo(
		() =>
			qs.stringify({
				apiKey: TRANSAK_API_KEY,
				// cryptoCurrencyCode: 'ETH',
				themeColor: '037dd6',
				// fiatCurrency: 'USD',
				walletAddressesData: JSON.stringify({
					networks: {
						erc20: { address }
					},
					coins: {
						DAI: { address }
					}
				}),
				redirectURL: TRANSAK_REDIRECT_URL
			}),
		[address]
	);
	return `${isDevelopment ? TRANSAK_URL_STAGING : TRANSAK_URL}?${params}`;
};
