import { Country, Order, State } from '@consensys/on-ramp-sdk';
import { AggregatorNetwork } from '@consensys/on-ramp-sdk/dist/API';
import {
  addAuthenticationUrl,
  addFiatCustomIdData,
  addFiatOrder,
  addActivationKey,
  removeAuthenticationUrl,
  removeFiatCustomIdData,
  removeFiatOrder,
  removeActivationKey,
  resetFiatOrders,
  setFiatOrdersGetStartedAGG,
  setFiatOrdersPaymentMethodAGG,
  setFiatOrdersRegionAGG,
  updateFiatCustomIdData,
  updateFiatOrder,
  updateActivationKey,
  updateOnRampNetworks,
} from '.';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../constants/on-ramp';
import { store } from '../../store';

interface WyreOrder {
  order: Record<string, unknown>;
  transfer: Record<string, unknown>;
}

// Source: https://redux.js.org/tutorials/typescript-quick-start
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;

export interface FiatOrder {
  id: string; // Original id given by Provider. Orders are identified by (provider, id)
  provider: FIAT_ORDER_PROVIDERS; // Fiat Provider
  createdAt: number; // Fiat amount
  amount: string | number; // Fiat amount
  fee?: string | number; // Fiat fee
  cryptoAmount?: string | number; // Crypto currency amount
  cryptoFee?: string | number; // Crypto currency fee
  currency: string; // "USD"
  cryptocurrency: string; // "ETH"
  currencySymbol?: string; // "$"
  amountInUSD?: string; // Fiat amount in USD
  state: FIAT_ORDER_STATES; // Order state
  account: string; // Account wallet address
  network: string; // Network
  txHash?: string; // Transaction hash
  excludeFromPurchases: boolean; // Exclude from purchases
  orderType: string; // Order type
  errorCount?: number; // Number of errors
  lastTimeFetched?: number; // Last time fetched
  data: Order | WyreOrder; // Original provider data
}

export interface CustomIdData {
  id: string;
  chainId: string;
  account: string;
  createdAt: number;
  lastTimeFetched: number;
  errorCount: number;
  expired?: boolean;
  order?: Record<string, any>;
}

export interface ActivationKey {
  key: string;
  active: boolean;
}
export interface FiatOrdersState {
  orders: FiatOrder[];
  customOrderIds: CustomIdData[];
  networks: AggregatorNetwork[];
  selectedRegionAgg: Country | null;
  selectedPaymentMethodAgg: string | null;
  getStartedAgg: boolean;
  authenticationUrls: string[];
  activationKeys: ActivationKey[];
}

export const ACTIONS = {
  FIAT_ADD_ORDER: 'FIAT_ADD_ORDER',
  FIAT_UPDATE_ORDER: 'FIAT_UPDATE_ORDER',
  FIAT_REMOVE_ORDER: 'FIAT_REMOVE_ORDER',
  FIAT_RESET: 'FIAT_RESET',
  FIAT_SET_COUNTRY: 'FIAT_SET_COUNTRY',
  // aggregator actions
  FIAT_SET_REGION_AGG: 'FIAT_SET_REGION_AGG',
  FIAT_SET_PAYMENT_METHOD_AGG: 'FIAT_SET_PAYMENT_METHOD_AGG',
  FIAT_SET_GETSTARTED_AGG: 'FIAT_SET_GETSTARTED_AGG',
  FIAT_ADD_CUSTOM_ID_DATA: 'FIAT_ADD_CUSTOM_ID_DATA',
  FIAT_UPDATE_CUSTOM_ID_DATA: 'FIAT_UPDATE_CUSTOM_ID_DATA',
  FIAT_REMOVE_CUSTOM_ID_DATA: 'FIAT_REMOVE_CUSTOM_ID_DATA',
  FIAT_ADD_AUTHENTICATION_URL: 'FIAT_ADD_AUTHENTICATION_URL',
  FIAT_REMOVE_AUTHENTICATION_URL: 'FIAT_REMOVE_AUTHENTICATION_URL',
  FIAT_ADD_ACTIVATION_KEY: 'FIAT_ADD_ACTIVATION_KEY',
  FIAT_UPDATE_ACTIVATION_KEY: 'FIAT_UPDATE_ACTIVATION_KEY',
  FIAT_REMOVE_ACTIVATION_KEY: 'FIAT_REMOVE_ACTIVATION_KEY',
  FIAT_UPDATE_NETWORKS: 'FIAT_UPDATE_NETWORKS',
} as const;

export type Action =
  | ReturnType<typeof resetFiatOrders>
  | ReturnType<typeof addFiatOrder>
  | ReturnType<typeof removeFiatOrder>
  | ReturnType<typeof updateFiatOrder>
  | ReturnType<typeof setFiatOrdersRegionAGG>
  | ReturnType<typeof setFiatOrdersPaymentMethodAGG>
  | ReturnType<typeof setFiatOrdersGetStartedAGG>
  | ReturnType<typeof addFiatCustomIdData>
  | ReturnType<typeof updateFiatCustomIdData>
  | ReturnType<typeof removeFiatCustomIdData>
  | ReturnType<typeof addAuthenticationUrl>
  | ReturnType<typeof removeAuthenticationUrl>
  | ReturnType<typeof addActivationKey>
  | ReturnType<typeof updateActivationKey>
  | ReturnType<typeof removeActivationKey>
  | ReturnType<typeof updateOnRampNetworks>;

export type Region = Country & State;
