import { useMemo } from 'react';
import axios from 'axios';
import qs from 'query-string';
import AppConstants from '../../../../core/AppConstants';
import Logger from '../../../../util/Logger';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
  NETWORKS_CHAIN_ID,
  SARDINE_NETWORK_PARAMETERS,
} from '../../../../constants/on-ramp';

//* env vars

const SARDINE_API_KEY_STAGING = process.env.SARDINE_API_KEY_STAGING;
const SARDINE_API_KEY_SECRET_STAGING =
  process.env.SARDINE_API_KEY_SECRET_STAGING;
const SARDINE_API_KEY_PRODUCTION = process.env.SARDINE_API_KEY_PRODUCTION;
const SARDINE_API_KEY_SECRET_PRODUCTION =
  process.env.SARDINE_API_KEY_SECRET_PRODUCTION;

//* typedefs

/**
 * @typedef {import('../../../../reducers/fiatOrders').FiatOrder} FiatOrder
 */

/**
 * https://sardineai.stoplight.io/docs/crypto-on-ramp/b3A6NDUyMjQyNTM-get-order-information
 * @typedef SardineOrder
 * @type {object}
 * @property {string} order_id
 * @property {string} started_at
 * @property {string} user_id
 * @property {SardineTrade[]} trades
 */

/**
 * https://sardineai.stoplight.io/docs/crypto-on-ramp/b3A6NDUyMjQyNTM-get-order-information
 * @typedef SardineTrade
 * @type {object}
 * @property {string} trade_id
 * @property {double} network_fee
 * @property {double} transaction_fee
 * @property {string} order_id
 * @property {string} created_at
 * @property {string} chain_type
 * @property {string} status
 * @property {string} tx_hash
 * @property {string} fiat_type
 * @property {double} fiat_price
 * @property {double} fiat_total
 * @property {string} asset_type
 * @property {double} asset_price
 * @property {double} asset_quantity
 * @property {double} asset_total
 * @property {string} payment_method_id
 * @property {string} wallet_id
 * @property {string} onchain_txn_status
 * @property {string} buy_or_sell
 */

/**
 * Query params added by Sardine when redirecting after completing flow

 * @typedef SardineRedirectOrder
 * @type {object}
 * @property {string} trade_id
 * @property {string} quote_id
 * @property {double} price
 * @property {double} quantity
 * @property {double} subtotal
 * @property {double} transaction_fee
 * @property {double} network_fee
 * @property {double} total
 * @property {double} totalFee
 * @property {string} asset_type
 * @property {string} network
 */

//* Functions
const SARDINE_ALLOWED_NETWORKS = [
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.BSC,
  NETWORKS_CHAIN_ID.POLYGON,
  NETWORKS_CHAIN_ID.AVAXCCHAIN,
  NETWORKS_CHAIN_ID.CELO,
  NETWORKS_CHAIN_ID.FANTOM,
];
export const isSardineAllowedToBuy = (chainId) =>
  SARDINE_ALLOWED_NETWORKS.includes(chainId);

//* Constants

const {
  SARDINE_URL,
  SARDINE_URL_STAGING,
  SARDINE_API_URL_STAGING,
  SARDINE_API_URL_PRODUCTION,
  SARDINE_REDIRECT_URL,
} = AppConstants.FIAT_ORDERS;

const isDevelopment = process.env.NODE_ENV !== 'production';

const SARDINE_API_BASE_URL = `${
  isDevelopment ? SARDINE_API_URL_STAGING : SARDINE_API_URL_PRODUCTION
}`;
const SARDINE_API_KEY = isDevelopment
  ? SARDINE_API_KEY_STAGING
  : SARDINE_API_KEY_PRODUCTION;
const SARDINE_API_KEY_SECRET = isDevelopment
  ? SARDINE_API_KEY_SECRET_STAGING
  : SARDINE_API_KEY_SECRET_PRODUCTION;

/**
 * https://integrate.sardine.com/69a2474c8d8d40daa04bd5bbe804fb6d?v=48a0c9fd98854078a4eaf5ec9a0a4f65
 * @enum {string}
 */
const SARDINE_ORDER_STATES = {
  AWAITING_PAYMENT_FROM_USER: 'AWAITING_PAYMENT_FROM_USER',
  PAYMENT_DONE_MARKED_BY_USER: 'PAYMENT_DONE_MARKED_BY_USER',
  PROCESSING: 'PROCESSING',
  PENDING_DELIVERY_FROM_SARDINE: 'PENDING_DELIVERY_FROM_SARDINE',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

//* API

const sardineApi = axios.create({
  baseURL: SARDINE_API_BASE_URL,
});

// const getPartnerStatus = () => sardineApi.get(`partners/${SARDINE_API_KEY}`);
const getClientToken = (orderId) =>
  sardineApi.get(`auth/client-token`, {
    params: { partnerAPISecret: SARDINE_API_KEY_SECRET },
  });
const getOrderStatus = (orderId) =>
  sardineApi.get(`trade/${orderId}`, {
    params: { partnerAPISecret: SARDINE_API_KEY_SECRET },
  });

//* Helpers

/**
 * Transforms a SardineOrder state into a FiatOrder state
 * @param {SARDINE_ORDER_STATES} sardineOrderState
 */
const sardineOrderStateToFiatOrderState = (sardineOrderState) => {
  switch (sardineOrderState) {
    case SARDINE_ORDER_STATES.COMPLETED: {
      return FIAT_ORDER_STATES.COMPLETED;
    }
    case SARDINE_ORDER_STATES.EXPIRED:
    case SARDINE_ORDER_STATES.FAILED: {
      return FIAT_ORDER_STATES.FAILED;
    }
    case SARDINE_ORDER_STATES.CANCELLED: {
      return FIAT_ORDER_STATES.CANCELLED;
    }
    case SARDINE_ORDER_STATES.AWAITING_PAYMENT_FROM_USER:
    case SARDINE_ORDER_STATES.PAYMENT_DONE_MARKED_BY_USER:
    case SARDINE_ORDER_STATES.PROCESSING:
    case SARDINE_ORDER_STATES.PENDING_DELIVERY_FROM_SARDINE:
    default: {
      return FIAT_ORDER_STATES.PENDING;
    }
  }
};

/**
 * Transforms Sardine order object into a Fiat order object used in the state.
 * @param {SardineTrade} sardineOrder Sardine order object
 * @returns {FiatOrder} Fiat order object to store in the state
 */
const sardineOrderToFiatOrder = (sardineOrder) => ({
  id: sardineOrder.order_id,
  provider: FIAT_ORDER_PROVIDERS.SARDINE,
  createdAt: new Date(sardineOrder.created_at).getTime(),
  amount: sardineOrder.fiat_price,
  fee: sardineOrder.network_fee,
  cryptoAmount: sardineOrder.asset_price,
  cryptoFee: sardineOrder.transaction_fee,
  currency: sardineOrder.fiat_type,
  cryptocurrency: sardineOrder.asset_type,
  amountInUSD: sardineOrder.asset_total,
  state: sardineOrderStateToFiatOrderState(sardineOrder.status),
  account: sardineOrder.wallet_id,
  txHash: sardineOrder.tx_hash || null,
  data: sardineOrder,
});

/**
 * Transforms Sardine order object into a Fiat order object used in the state.
 * @param {SardineRedirectOrder} sardineRedirectOrder Sardine order object
 * @returns {FiatOrder} Fiat order object to store in the state
 */
export const sardineCallbackOrderToFiatOrder = (sardineRedirectOrder) => ({
  id: sardineRedirectOrder.trade_id,
  provider: FIAT_ORDER_PROVIDERS.SARDINE,
  createdAt: Date.now(),
  amount: Number(sardineRedirectOrder.total),
  fee: Number(sardineRedirectOrder.network_fee),
  currency: sardineRedirectOrder.asset_type || sardineRedirectOrder.fiat_type,
  cryptoAmount: sardineRedirectOrder.price,
  cryptocurrency:
    sardineRedirectOrder.fiat_type || sardineRedirectOrder.asset_type,
  state: SARDINE_ORDER_STATES.PROCESSING,
  account: '',
  data: sardineRedirectOrder,
});

//* Handlers

/**
 * Function to handle Sardine flow redirect after order creation
 * @param {String} url Custom URL with query params sardine flow redirected to.
 * Query parameters are: `orderId`, `fiatCurrency`, `cryptoCurrency`, `fiatAmount`,
 * `cryptoAmount`, `isBuyOrSell`, `status`, `walletAddress`,
 * `totalFee`, `partnerCustomerId`, `partnerOrderId`.
 * @param {String} network Current network selected in the app
 * @returns {FiatOrder}
 */
export const handleSardineRedirect = (url, network) => {
  /** @type {SardineRedirectOrder} */
  console.log(url);
  const data = qs.parse(url.split(SARDINE_REDIRECT_URL)[1]);
  const order = { ...sardineCallbackOrderToFiatOrder(data), network };
  return order;
};

/**
 * Function used to poll and update the order
 * @param {FiatOrder} order Order coming from the state
 * @param {SardineOrder} order.data Original Sardine order
 * @returns {FiatOrder} Fiat order to update in the state
 */
export async function processSardineOrder(order) {
  try {
    const {
      data: { response },
    } = await getOrderStatus(order.id);
    if (!response) {
      throw new Error('Payment Request Failed: empty sardine response');
    }
    return {
      ...order,
      ...sardineOrderToFiatOrder(response),
    };
  } catch (error) {
    Logger.error(error, {
      message: 'FiatOrders::SardineProcessor error while processing order',
      order,
    });
    return order;
  }
}

//* Hooks

export const useSardineFlowURL = (address, chainId) => {
  const params = useMemo(() => {
    const selectedChainId = isSardineAllowedToBuy(chainId)
      ? chainId
      : NETWORKS_CHAIN_ID.MAINNET;
    const [network, defaultCryptoCurrency, cryptoCurrencyList] =
      SARDINE_NETWORK_PARAMETERS[selectedChainId];
    return qs.stringify({
      apiKey: SARDINE_API_KEY,
      defaultCryptoCurrency,
      cryptoCurrencyList,
      network,
      themeColor: '037dd6',
      walletAddress: address,
      source: 'app',
      redirectURL: SARDINE_REDIRECT_URL,
    });
  }, [address, chainId]);
  return `${isDevelopment ? SARDINE_URL_STAGING : SARDINE_URL}?${params}`;
};
