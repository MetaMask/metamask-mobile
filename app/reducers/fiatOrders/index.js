import { createSelector } from 'reselect';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../constants/on-ramp';

/**
 * @typedef FiatOrder
 * @type {object}
 * @property {string} id - Original id given by Provider. Orders are identified by (provider, id)
 * @property {FIAT_ORDER_PROVIDERS}  provider Fiat Provider
 * @property {number} createdAt Fiat amount
 * @property {string|number} amount Fiat amount
 * @property {string|number} [fee] Fiat fee
 * @property {string|number} [cryptoAmount] Crypto currency amount
 * @property {string|number} [cryptoFee] Crypto currency fee
 * @property {string} currency "USD"
 * @property {string} cryptocurrency "ETH"
 * @property {string} [currencySymbol] "$"
 * @property {string} [amountInUSD] Fiat amount in USD
 * @property {FIAT_ORDER_STATES} state Order state
 * @property {string} account <account wallet address>
 * @property {string} network <network>
 * @property {?string} txHash <transaction hash | null>
 * @property {object|import('@consensys/on-ramp-sdk').Order} data original provider data
 * @property {object} [data.order] : Wyre order response
 * @property {object} [data.transfer] : Wyre transfer response
 */

/** Action Creators */

const ACTIONS = {
  FIAT_ADD_ORDER: 'FIAT_ADD_ORDER',
  FIAT_UPDATE_ORDER: 'FIAT_UPDATE_ORDER',
  FIAT_REMOVE_ORDER: 'FIAT_REMOVE_ORDER',
  FIAT_RESET: 'FIAT_RESET',
  FIAT_SET_COUNTRY: 'FIAT_SET_COUNTRY',
  // aggregator actions
  FIAT_SET_REGION_AGG: 'FIAT_SET_REGION_AGG',
  FIAT_SET_PAYMENT_METHOD_AGG: 'FIAT_SET_PAYMENT_METHOD_AGG',
  FIAT_SET_GETSTARTED_AGG: 'FIAT_SET_GETSTARTED_AGG',
};

export const addFiatOrder = (order) => ({
  type: ACTIONS.FIAT_ADD_ORDER,
  payload: order,
});
export const updateFiatOrder = (order) => ({
  type: ACTIONS.FIAT_UPDATE_ORDER,
  payload: order,
});
export const setFiatOrdersCountry = (countryCode) => ({
  type: ACTIONS.FIAT_SET_COUNTRY,
  payload: countryCode,
});
export const setFiatOrdersRegionAGG = (regionCode) => ({
  type: ACTIONS.FIAT_SET_REGION_AGG,
  payload: regionCode,
});
export const setFiatOrdersPaymentMethodAGG = (paymentMethodId) => ({
  type: ACTIONS.FIAT_SET_PAYMENT_METHOD_AGG,
  payload: paymentMethodId,
});
export const setFiatOrdersGetStartedAGG = (getStartedFlag) => ({
  type: ACTIONS.FIAT_SET_GETSTARTED_AGG,
  payload: getStartedFlag,
});

/**
 * Selectors
 */

/**
 * Get the provider display name
 * @param {FIAT_ORDER_PROVIDERS} provider
 */
export const getProviderName = (provider, data = {}) => {
  switch (provider) {
    case FIAT_ORDER_PROVIDERS.WYRE:
    case FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY: {
      return 'Wyre';
    }
    case FIAT_ORDER_PROVIDERS.TRANSAK: {
      return 'Transak';
    }
    case FIAT_ORDER_PROVIDERS.MOONPAY: {
      return 'MoonPay';
    }
    case FIAT_ORDER_PROVIDERS.AGGREGATOR: {
      const providerName = data.provider?.name;
      return providerName ? `${providerName}` : '...';
    }
    default: {
      return provider;
    }
  }
};

const INITIAL_SELECTED_REGION = null;
const INITIAL_GET_STARTED = false;
const INITIAL_PAYMENT_METHOD = '/payments/debit-credit-card';

const ordersSelector = (state) => state.fiatOrders.orders || [];
export const chainIdSelector = (state) =>
  state.engine.backgroundState.NetworkController.provider.chainId;

export const selectedAddressSelector = (state) =>
  state.engine.backgroundState.PreferencesController.selectedAddress;
export const fiatOrdersCountrySelector = (state) =>
  state.fiatOrders.selectedCountry;
export const fiatOrdersRegionSelectorAgg = (state) =>
  state.fiatOrders.selectedRegionAgg;
export const fiatOrdersPaymentMethodSelectorAgg = (state) =>
  state.fiatOrders.selectedPaymentMethodAgg;
export const fiatOrdersGetStartedAgg = (state) =>
  state.fiatOrders.getStartedAgg;

export const getOrders = createSelector(
  ordersSelector,
  selectedAddressSelector,
  chainIdSelector,
  (orders, selectedAddress, chainId) =>
    orders.filter(
      (order) =>
        order.account === selectedAddress &&
        Number(order.network) === Number(chainId),
    ),
);

export const getPendingOrders = createSelector(
  ordersSelector,
  selectedAddressSelector,
  chainIdSelector,
  (orders, selectedAddress, chainId) =>
    orders.filter(
      (order) =>
        order.account === selectedAddress &&
        Number(order.network) === Number(chainId) &&
        order.state === FIAT_ORDER_STATES.PENDING,
    ),
);

export const makeOrderIdSelector = (orderId) =>
  createSelector(ordersSelector, (orders) =>
    orders.find((order) => order.id === orderId),
  );

export const getHasOrders = createSelector(
  getOrders,
  (orders) => orders.length > 0,
);

const initialState = {
  orders: [],
  selectedCountry: 'US',
  // initial state for fiat on-ramp aggregator
  selectedRegionAgg: INITIAL_SELECTED_REGION,
  selectedPaymentMethodAgg: INITIAL_PAYMENT_METHOD,
  getStartedAgg: INITIAL_GET_STARTED,
};

const findOrderIndex = (provider, id, orders) =>
  orders.findIndex((order) => order.id === id && order.provider === provider);

const fiatOrderReducer = (state = initialState, action) => {
  switch (action.type) {
    case ACTIONS.FIAT_ADD_ORDER: {
      const orders = state.orders;
      const order = action.payload;
      const index = findOrderIndex(order.provider, order.id, orders);
      if (index !== -1) {
        return state;
      }
      return {
        ...state,
        orders: [action.payload, ...state.orders],
      };
    }
    case ACTIONS.FIAT_UPDATE_ORDER: {
      const orders = state.orders;
      const order = action.payload;
      const index = findOrderIndex(order.provider, order.id, orders);
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        orders: [
          ...orders.slice(0, index),
          {
            ...orders[index],
            ...order,
          },
          ...orders.slice(index + 1),
        ],
      };
    }
    case ACTIONS.FIAT_REMOVE_ORDER: {
      const orders = state.orders;
      const order = action.payload;
      const index = findOrderIndex(order.provider, order.id, state.orders);
      return {
        ...state,
        orders: [...orders.slice(0, index), ...orders.slice(index + 1)],
      };
    }
    case ACTIONS.FIAT_RESET: {
      return initialState;
    }
    case ACTIONS.FIAT_SET_GETSTARTED_AGG: {
      return {
        ...state,
        getStartedAgg: action.payload,
      };
    }
    case ACTIONS.FIAT_SET_COUNTRY: {
      return {
        ...state,
        selectedCountry: action.payload,
      };
    }
    case ACTIONS.FIAT_SET_REGION_AGG: {
      return {
        ...state,
        selectedRegionAgg: action.payload,
      };
    }
    case ACTIONS.FIAT_SET_PAYMENT_METHOD_AGG: {
      return {
        ...state,
        selectedPaymentMethodAgg: action.payload,
      };
    }
    default: {
      return state;
    }
  }
};

export default fiatOrderReducer;
