import { Country, Order, State } from '@consensys/on-ramp-sdk';
import {
  AggregatorNetwork,
  OrderOrderTypeEnum,
} from '@consensys/on-ramp-sdk/dist/API';
import {
  DepositOrder,
  DepositOrderType,
  DepositCryptoCurrency,
  DepositPaymentMethod,
  DepositRegion,
} from '../../components/UI/Ramp/types/legacyDeposit';
import type { RampsOrder } from '@metamask/ramps-controller';
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
  setFiatOrdersGetStartedSell,
  setFiatOrdersGetStartedDeposit,
  setFiatOrdersPaymentMethodAGG,
  setFiatOrdersRegionAGG,
  setFiatOrdersRegionDeposit,
  setFiatOrdersCryptoCurrencyDeposit,
  setFiatOrdersPaymentMethodDeposit,
  updateFiatCustomIdData,
  updateFiatOrder,
  updateActivationKey,
  updateOnRampNetworks,
  setFiatSellTxHash,
  removeFiatSellTxHash,
  setHasAgreedTransakNativePolicy,
  setFiatProviderScope,
  setDirectMoneyMusdForceOff,
} from '.';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../constants/on-ramp';

interface WyreOrder {
  order: Record<string, unknown>;
  transfer: Record<string, unknown>;
}

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
  sellTxHash?: string; // Sell transaction hash the user has sent
  excludeFromPurchases: boolean; // Exclude from purchases
  orderType: OrderOrderTypeEnum | DepositOrderType; // Order type
  errorCount?: number; // Number of errors
  lastTimeFetched?: number; // Last time fetched
  forceUpdate?: boolean; // Force update when processing
  data: Order | WyreOrder | DepositOrder | RampsOrder; // Original provider data
}

export interface CustomIdData {
  id: string;
  chainId: string;
  account: string;
  createdAt: number;
  lastTimeFetched: number;
  errorCount: number;
  orderType: OrderOrderTypeEnum;
  expired?: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order?: Record<string, any>;
}

export interface ActivationKey {
  key: string;
  label?: string;
  active: boolean;
}
/**
 * Provider-class scope for the headless fiat quote path (Phase 1 dev/RC gate).
 * Mirrors `@metamask/ramps-controller`'s `ProviderScope`.
 * - `off`: native-only (default / production).
 * - `in-app`: also allow in-app WebView aggregator providers.
 * - `all`: additionally allow external / custom-action providers (Phase 2).
 */
export type FiatProviderScope = 'off' | 'in-app' | 'all';

export interface FiatOrdersState {
  orders: FiatOrder[];
  customOrderIds: CustomIdData[];
  networks: AggregatorNetwork[];
  selectedRegionAgg: Country | null;
  selectedRegionDeposit: DepositRegion | null;
  selectedCryptoCurrencyDeposit: DepositCryptoCurrency | null;
  selectedPaymentMethodDeposit: DepositPaymentMethod | null;
  selectedPaymentMethodAgg: string | null;
  getStartedAgg: boolean;
  getStartedSell: boolean;
  getStartedDeposit: boolean;
  /** Unified Buy / Transak native: user agreed to policy copy on the verify-identity explainer screen */
  hasAgreedTransakNativePolicy: boolean;
  authenticationUrls: string[];
  activationKeys: ActivationKey[];
  /**
   * Headless fiat provider-class scope (dev/RC gate). Optional so persisted
   * state predating this field rehydrates to the `off` default via the selector.
   */
  providerScope?: FiatProviderScope;
  /**
   * Non-production dev override for the core `directMoneyMusdEnabled` route
   * decision. When `true`, the Engine forces
   * `remoteFeatureFlags.confirmations_pay_fiat.directMoneyMusdEnabled` OFF so the
   * Money Account fiat deposit takes the buy-ETH-then-convert fallback path
   * instead of mUSD-direct. Optional so persisted state predating this field
   * rehydrates to the `false` (use-remote-value) default via the selector. The
   * production hard-off guard is applied by `getEffectiveDirectMoneyMusdForceOff`
   * in the Engine remote-feature-flag utils, not here.
   */
  directMoneyMusdForceOff?: boolean;
}

export const ACTIONS = {
  FIAT_ADD_ORDER: 'FIAT_ADD_ORDER',
  FIAT_UPDATE_ORDER: 'FIAT_UPDATE_ORDER',
  FIAT_REMOVE_ORDER: 'FIAT_REMOVE_ORDER',
  FIAT_RESET: 'FIAT_RESET',
  FIAT_SET_COUNTRY: 'FIAT_SET_COUNTRY',
  // aggregator actions
  FIAT_SET_REGION_AGG: 'FIAT_SET_REGION_AGG',
  FIAT_SET_REGION_DEPOSIT: 'FIAT_SET_REGION_DEPOSIT',
  FIAT_SET_CRYPTO_CURRENCY_DEPOSIT: 'FIAT_SET_CRYPTO_CURRENCY_DEPOSIT',
  FIAT_SET_PAYMENT_METHOD_DEPOSIT: 'FIAT_SET_PAYMENT_METHOD_DEPOSIT',
  FIAT_SET_PAYMENT_METHOD_AGG: 'FIAT_SET_PAYMENT_METHOD_AGG',
  FIAT_SET_GETSTARTED_AGG: 'FIAT_SET_GETSTARTED_AGG',
  FIAT_SET_GETSTARTED_SELL: 'FIAT_SET_GETSTARTED_SELL',
  FIAT_SET_GETSTARTED_DEPOSIT: 'FIAT_SET_GETSTARTED_DEPOSIT',
  FIAT_ADD_CUSTOM_ID_DATA: 'FIAT_ADD_CUSTOM_ID_DATA',
  FIAT_UPDATE_CUSTOM_ID_DATA: 'FIAT_UPDATE_CUSTOM_ID_DATA',
  FIAT_REMOVE_CUSTOM_ID_DATA: 'FIAT_REMOVE_CUSTOM_ID_DATA',
  FIAT_ADD_AUTHENTICATION_URL: 'FIAT_ADD_AUTHENTICATION_URL',
  FIAT_REMOVE_AUTHENTICATION_URL: 'FIAT_REMOVE_AUTHENTICATION_URL',
  FIAT_ADD_ACTIVATION_KEY: 'FIAT_ADD_ACTIVATION_KEY',
  FIAT_UPDATE_ACTIVATION_KEY: 'FIAT_UPDATE_ACTIVATION_KEY',
  FIAT_REMOVE_ACTIVATION_KEY: 'FIAT_REMOVE_ACTIVATION_KEY',
  FIAT_UPDATE_NETWORKS: 'FIAT_UPDATE_NETWORKS',
  FIAT_SET_SELL_TX_HASH: 'FIAT_SET_SELL_TX_HASH',
  FIAT_REMOVE_SELL_TX_HASH: 'FIAT_REMOVE_SELL_TX_HASH',
  FIAT_SET_HAS_AGREED_TRANSAK_NATIVE_POLICY:
    'FIAT_SET_HAS_AGREED_TRANSAK_NATIVE_POLICY',
  FIAT_SET_PROVIDER_SCOPE: 'FIAT_SET_PROVIDER_SCOPE',
  FIAT_SET_DIRECT_MONEY_MUSD_FORCE_OFF: 'FIAT_SET_DIRECT_MONEY_MUSD_FORCE_OFF',
} as const;

export type Action =
  | ReturnType<typeof resetFiatOrders>
  | ReturnType<typeof addFiatOrder>
  | ReturnType<typeof removeFiatOrder>
  | ReturnType<typeof updateFiatOrder>
  | ReturnType<typeof setFiatOrdersRegionAGG>
  | ReturnType<typeof setFiatOrdersRegionDeposit>
  | ReturnType<typeof setFiatOrdersCryptoCurrencyDeposit>
  | ReturnType<typeof setFiatOrdersPaymentMethodDeposit>
  | ReturnType<typeof setFiatOrdersPaymentMethodAGG>
  | ReturnType<typeof setFiatOrdersGetStartedAGG>
  | ReturnType<typeof setFiatOrdersGetStartedSell>
  | ReturnType<typeof setFiatOrdersGetStartedDeposit>
  | ReturnType<typeof addFiatCustomIdData>
  | ReturnType<typeof updateFiatCustomIdData>
  | ReturnType<typeof removeFiatCustomIdData>
  | ReturnType<typeof addAuthenticationUrl>
  | ReturnType<typeof removeAuthenticationUrl>
  | ReturnType<typeof addActivationKey>
  | ReturnType<typeof updateActivationKey>
  | ReturnType<typeof removeActivationKey>
  | ReturnType<typeof updateOnRampNetworks>
  | ReturnType<typeof setFiatSellTxHash>
  | ReturnType<typeof removeFiatSellTxHash>
  | ReturnType<typeof setHasAgreedTransakNativePolicy>
  | ReturnType<typeof setFiatProviderScope>
  | ReturnType<typeof setDirectMoneyMusdForceOff>;

export type Region = Country & State;

export enum RampType {
  BUY = 'buy',
  SELL = 'sell',
}
