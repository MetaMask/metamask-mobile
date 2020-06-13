import { useMemo } from 'react';
import axios from 'axios';
import qs from 'query-string';
import {
	TRANSAK_URL,
	TRANSAK_URL_STAGING,
	TRANSAK_API_URL_STAGING,
	TRANSAK_API_URL_PRODUCTION,
	TRANSAK_API_KEY_STAGING,
	TRANSAK_API_KEY_PRODUCTION
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

/**
 * @enum {string}
 */
export const TRANSAK_ORDER_STATES = {
	AWAITING_PAYMENT_FROM_USER: 'AWAITING_PAYMENT_FROM_USER',
	PAYMENT_DONE_MARKED_BY_USER: 'PAYMENT_DONE_MARKED_BY_USER',
	PENDING_DELIVERY_FROM_TRANSAK: 'PENDING_DELIVERY_FROM_TRANSAK',
	COMPLETED: 'COMPLETED',
	CANCELLED: 'CANCELLED'
};

//* API

const transakApi = axios.create({
	baseURL: TRANSAK_API_BASE_URL
});

/* eslint-disable no-unused-vars */
const getPartnerStatus = () => transakApi.get(`partners/${TRANSAK_API_KEY}`);
const getOrderStatus = orderId => transakApi.get(`orders/${orderId}`);
/* eslint-enable no-unused-vars */

//* Helpers

/**
 * Transforms a Transak order state into a fiat order state
 * @param {TRANSAK_ORDER_STATES} transakOrderState
 */
const transakOrderStateToFiatOrderState = transakOrderState => {
	switch (transakOrderState) {
		case TRANSAK_ORDER_STATES.AWAITING_PAYMENT_FROM_USER:
		case TRANSAK_ORDER_STATES.PAYMENT_DONE_MARKED_BY_USER:
		case TRANSAK_ORDER_STATES.PENDING_DELIVERY_FROM_TRANSAK: {
			return FIAT_ORDER_STATES.PENDING;
		}
		case TRANSAK_ORDER_STATES.COMPLETED: {
			return FIAT_ORDER_STATES.COMPLETED;
		}
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
	id: transakOrder.orderId,
	provider: FIAT_ORDER_PROVIDERS.TRANSAK,
	amount: transakOrder.fiatAmount,
	fee: transakOrder.totalFee,
	currency: transakOrder.fiatCurrency,
	state: transakOrderStateToFiatOrderState(transakOrder),
	account: transakOrder.walletAddress,
	data: transakOrder
});

//* Handlers

/**
 * Function to handle Transak flow redirect after order creation
 * @param {String} url Custom URL with query params transak flow redirected to.
 * Query parameters are: `orderId`, `fiatCurrency`, `cryptocurrency`, `fiatAmount`,
 * `cryptoAmount`, `isBuyOrSell`, `status`, `walletAddress`,
 * `totalFee`, `partnerCustomerId`, `partnerOrderId`.
 * @param {String} network Current network selected in the app
 */
export const handleTransakRedirect = (url, network) => {
	// Order created from Transak flow, needs to be added to the polling.
	const data = qs.parse(url.split(TRANSAK_REDIRECT_URL)[1]);
	/* const actualOrder = {
		cryptoAmount: '0.18065827',
		cryptocurrency: 'ETH',
		fiatAmount: '35',
		fiatCurrency: 'GBP',
		isBuyOrSell: 'BUY',
		orderId: '11aaf266-4ee9-4cdb-8dbf-420a8f4f2193',
		status: 'PENDING_DELIVERY_FROM_TRANSAK',
		totalFeeInFiat: '1.37',
		walletAddress: '0x33C04960375BBB2373e9Dd28C17CE125B08EC74f'
	};*/
	const order = { ...transakOrderToFiatOrder(data), network };

	// TODO: add to fiatOrder state
};

// handleTransakRedirect(
// 	'https://metamask.io/?orderId=%22071c9aa3-e03a-4e88-afba-c108d05c3ec4%22&fiatCurrency=%22USD%22&cryptocurrency=%22ETH%22&fiatAmount=35&cryptoAmount=0.1369118&isBuyOrSell=%22BUY%22&status=%22PROCESSING%22&walletAddress=%220x33C04960375BBB2373e9Dd28C17CE125B08EC74f%22&totalFee=undefined'
// );

/**
 * Function used to poll and update the order
 * @param {FiatOrder} order Order coming from the state
 * @param {TransakOrder} order.data Original Transak order
 * @returns {FiatOrder} Fiat order to update in the state
 */
export async function processTransakOrder(order) {
	console.log('processTransakOrder');
	// try {
	// 	const { data } = await getOrderStatus(order.id);
	// /* TODO: Check order status and update order object. */
	// 	console.log({ data });
	// } catch (error) {
	// 	console.error(error);
	// }

	// Return updated order
	return order;
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
