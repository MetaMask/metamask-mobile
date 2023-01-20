import { Order } from '@consensys/on-ramp-sdk';
import { createSelector } from 'reselect';
import { Region } from '../../components/UI/FiatOnRampAggregator/types';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../constants/on-ramp';
import {
  Action,
  ACTIONS,
  CustomIdData,
  FiatOrder,
  FiatOrdersState,
  RootState,
} from './types';
export type { FiatOrder } from './types';

/** Action Creators */

export const resetFiatOrders = () => ({
  type: ACTIONS.FIAT_RESET,
});
export const addFiatOrder = (order: FiatOrder) => ({
  type: ACTIONS.FIAT_ADD_ORDER,
  payload: order,
});
export const removeFiatOrder = (order: FiatOrder) => ({
  type: ACTIONS.FIAT_REMOVE_ORDER,
  payload: order,
});
export const updateFiatOrder = (order: FiatOrder) => ({
  type: ACTIONS.FIAT_UPDATE_ORDER,
  payload: order,
});
export const setFiatOrdersRegionAGG = (region: Region | null) => ({
  type: ACTIONS.FIAT_SET_REGION_AGG,
  payload: region,
});
export const setFiatOrdersPaymentMethodAGG = (
  paymentMethodId: string | null,
) => ({
  type: ACTIONS.FIAT_SET_PAYMENT_METHOD_AGG,
  payload: paymentMethodId,
});
export const setFiatOrdersGetStartedAGG = (getStartedFlag: boolean) => ({
  type: ACTIONS.FIAT_SET_GETSTARTED_AGG,
  payload: getStartedFlag,
});
export const addFiatCustomIdData = (customIdData: CustomIdData) => ({
  type: ACTIONS.FIAT_ADD_CUSTOM_ID_DATA,
  payload: customIdData,
});
export const updateFiatCustomIdData = (customIdData: CustomIdData) => ({
  type: ACTIONS.FIAT_UPDATE_CUSTOM_ID_DATA,
  payload: customIdData,
});
export const removeFiatCustomIdData = (customIdData: CustomIdData) => ({
  type: ACTIONS.FIAT_REMOVE_CUSTOM_ID_DATA,
  payload: customIdData,
});
export const addAuthenticationUrl = (authenticationUrl: string) => ({
  type: ACTIONS.FIAT_ADD_AUTHENTICATION_URL,
  payload: authenticationUrl,
});
export const removeAuthenticationUrl = (authenticationUrl: string) => ({
  type: ACTIONS.FIAT_REMOVE_AUTHENTICATION_URL,
  payload: authenticationUrl,
});
export const addActivationKey = (activationKey: string) => ({
  type: ACTIONS.FIAT_ADD_ACTIVATION_KEY,
  payload: activationKey,
});
export const removeActivationKey = (activationKey: string) => ({
  type: ACTIONS.FIAT_REMOVE_ACTIVATION_KEY,
  payload: activationKey,
});
export const updateActivationKey = (
  activationKey: string,
  active: boolean,
) => ({
  type: ACTIONS.FIAT_UPDATE_ACTIVATION_KEY,
  payload: { key: activationKey, active },
});

/**
 * Selectors
 */

/**
 * Get the provider display name
 * @param {FIAT_ORDER_PROVIDERS} provider
 */
export const getProviderName = (
  provider: FIAT_ORDER_PROVIDERS,
  data: FiatOrder['data'],
) => {
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
      const providerName = (data as Order).provider?.name;
      return providerName ? `${providerName}` : '...';
    }
    default: {
      return provider;
    }
  }
};

const ordersSelector = (state: RootState) =>
  (state.fiatOrders.orders as FiatOrdersState['orders']) || [];
export const chainIdSelector: (state: RootState) => string = (
  state: RootState,
) => state.engine.backgroundState.NetworkController.provider.chainId;

export const selectedAddressSelector: (state: RootState) => string = (
  state: RootState,
) => state.engine.backgroundState.PreferencesController.selectedAddress;
export const fiatOrdersRegionSelectorAgg: (
  state: RootState,
) => FiatOrdersState['selectedRegionAgg'] = (state: RootState) =>
  state.fiatOrders.selectedRegionAgg;
export const fiatOrdersPaymentMethodSelectorAgg: (
  state: RootState,
) => FiatOrdersState['selectedPaymentMethodAgg'] = (state: RootState) =>
  state.fiatOrders.selectedPaymentMethodAgg;
export const fiatOrdersGetStartedAgg: (
  state: RootState,
) => FiatOrdersState['getStartedAgg'] = (state: RootState) =>
  state.fiatOrders.getStartedAgg;

export const getOrders = createSelector(
  ordersSelector,
  selectedAddressSelector,
  chainIdSelector,
  (orders, selectedAddress, chainId) =>
    orders.filter(
      (order) =>
        !order.excludeFromPurchases &&
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

const customOrdersSelector: (
  state: RootState,
) => FiatOrdersState['customOrderIds'] = (state: RootState) =>
  state.fiatOrders.customOrderIds || [];

export const getCustomOrderIds = createSelector(
  customOrdersSelector,
  selectedAddressSelector,
  chainIdSelector,
  (customOrderIds, selectedAddress, chainId) =>
    customOrderIds.filter(
      (customOrderId) =>
        customOrderId.account === selectedAddress &&
        Number(customOrderId.chainId) === Number(chainId),
    ),
);

export const makeOrderIdSelector = (orderId?: FiatOrder['id']) =>
  createSelector(ordersSelector, (orders) =>
    orders.find((order) => order.id === orderId),
  );

export const getAuthenticationUrls: (
  state: RootState,
) => FiatOrdersState['authenticationUrls'] = (state: RootState) =>
  state.fiatOrders.authenticationUrls || [];

export const getActivationKeys: (
  state: RootState,
) => FiatOrdersState['activationKeys'] = (state: RootState) =>
  state.fiatOrders.activationKeys || [];

export const getHasOrders = createSelector(
  getOrders,
  (orders) => orders.length > 0,
);

export const initialState: FiatOrdersState = {
  orders: [],
  customOrderIds: [],
  selectedRegionAgg: null,
  selectedPaymentMethodAgg: null,
  getStartedAgg: false,
  authenticationUrls: [],
  activationKeys: [],
};

const findOrderIndex = (
  provider: FiatOrder['provider'],
  id: FiatOrder['id'],
  orders: FiatOrder[],
) =>
  orders.findIndex((order) => order.id === id && order.provider === provider);

const findCustomIdIndex = (
  id: FiatOrder['id'],
  customOrderIds: CustomIdData[],
) => customOrderIds.findIndex((customOrderId) => customOrderId.id === id);

const fiatOrderReducer: (
  state: FiatOrdersState | undefined,
  action: Action | Record<'type', null>,
) => FiatOrdersState = (state = initialState, action = { type: null }) => {
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
      if (index === -1) {
        return state;
      }

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
    case ACTIONS.FIAT_ADD_CUSTOM_ID_DATA: {
      const customOrderIds = state.customOrderIds;
      const customIdData = action.payload;
      const index = findCustomIdIndex(customIdData.id, customOrderIds);
      if (index !== -1) {
        return state;
      }
      return {
        ...state,
        customOrderIds: [...state.customOrderIds, action.payload],
      };
    }
    case ACTIONS.FIAT_UPDATE_CUSTOM_ID_DATA: {
      const customOrderIds = state.customOrderIds;
      const customIdData = action.payload;
      const index = findCustomIdIndex(customIdData.id, customOrderIds);
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        customOrderIds: [
          ...customOrderIds.slice(0, index),
          {
            ...customOrderIds[index],
            ...customIdData,
          },
          ...customOrderIds.slice(index + 1),
        ],
      };
    }
    case ACTIONS.FIAT_REMOVE_CUSTOM_ID_DATA: {
      const customOrderIds = state.customOrderIds;
      const customIdData = action.payload;
      const index = findCustomIdIndex(customIdData.id, customOrderIds);
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        customOrderIds: [
          ...customOrderIds.slice(0, index),
          ...customOrderIds.slice(index + 1),
        ],
      };
    }
    case ACTIONS.FIAT_ADD_AUTHENTICATION_URL: {
      const authenticationUrls = state.authenticationUrls;
      const authenticationUrl = action.payload;
      const index = authenticationUrls.findIndex(
        (url) => url === authenticationUrl,
      );
      if (index !== -1) {
        return state;
      }
      return {
        ...state,
        authenticationUrls: [...state.authenticationUrls, authenticationUrl],
      };
    }
    case ACTIONS.FIAT_REMOVE_AUTHENTICATION_URL: {
      const authenticationUrls = state.authenticationUrls;
      const authenticationUrl = action.payload;
      const index = authenticationUrls.findIndex(
        (url) => url === authenticationUrl,
      );
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        authenticationUrls: [
          ...authenticationUrls.slice(0, index),
          ...authenticationUrls.slice(index + 1),
        ],
      };
    }
    case ACTIONS.FIAT_ADD_ACTIVATION_KEY: {
      const activationKeys = state.activationKeys;
      const key = action.payload;
      const index = activationKeys.findIndex(
        (activationKey) => activationKey.key === key,
      );
      if (index !== -1) {
        return state;
      }
      return {
        ...state,
        activationKeys: [...state.activationKeys, { key, active: true }],
      };
    }
    case ACTIONS.FIAT_REMOVE_ACTIVATION_KEY: {
      const activationKeys = state.activationKeys;
      const key = action.payload;
      const index = activationKeys.findIndex(
        (activationKey) => activationKey.key === key,
      );
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        activationKeys: [
          ...activationKeys.slice(0, index),
          ...activationKeys.slice(index + 1),
        ],
      };
    }
    case ACTIONS.FIAT_UPDATE_ACTIVATION_KEY: {
      const activationKeys = state.activationKeys;
      const { key, active } = action.payload;
      const index = activationKeys.findIndex(
        (activationKey) => activationKey.key === key,
      );
      if (index === -1) {
        return state;
      }
      return {
        ...state,
        activationKeys: [
          ...activationKeys.slice(0, index),
          {
            ...activationKeys[index],
            active,
          },
          ...activationKeys.slice(index + 1),
        ],
      };
    }

    default: {
      return state;
    }
  }
};

export default fiatOrderReducer;
