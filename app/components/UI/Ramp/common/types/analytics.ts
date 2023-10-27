import { MetaMetricsEvents } from 'app/core/Analytics';

export type ScreenLocation =
  | 'Amount to Buy Screen'
  | 'Payment Method Screen'
  | 'Region Screen'
  | 'Quotes Screen'
  | 'Provider Webview'
  | 'Provider InApp Browser'
  | 'Get Started Screen'
  | 'Network Switcher Screen'
  | 'Order Details Screen'
  | 'Settings Screen';

interface RampButtonClicked {
  text: 'Buy' | 'Buy Native Token';
  location: string;
}
interface BuyButtonClicked extends RampButtonClicked {
  chain_id_destination?: string;
}
interface SellButtonClicked extends RampButtonClicked {
  chain_id_source?: string;
}

interface RampRegionSelected {
  country_onramp_id: string;
  state_onramp_id?: string;
  location?: ScreenLocation;
}

interface OnrampRegionSelected extends RampRegionSelected {
  is_unsupported: boolean;
}

interface OfframpRegionSelected extends RampRegionSelected {
  is_unsupported_offramp: boolean;
}

export interface RampRegionReset {
  location?: ScreenLocation;
}

export interface RampPaymentMethodSelected {
  payment_method_id: string;
  available_payment_method_ids: string[];
  region?: string;
  location?: ScreenLocation;
}

export interface RampContinueToAmountClicked {
  payment_method_id: string;
  available_payment_method_ids: string[];
  region: string;
  location: ScreenLocation;
}

export interface RampQuoteRequested {
  currency_source: string;
  currency_destination: string;
  payment_method_id: string;
  amount: number;
  location: ScreenLocation;
}

interface OnRampQuoteRequested extends RampQuoteRequested {
  chain_id_destination: string;
}

interface OffRampQuoteRequested extends RampQuoteRequested {
  chain_id_source: string;
}

export interface RampCanceled {
  location: ScreenLocation;
  results_count?: number;
}

interface OnrampCanceled extends RampCanceled {
  chain_id_destination: string;
  provider_onramp?: string;
}

interface OfframpCanceled extends RampCanceled {
  chain_id_source: string;
  provider_offramp?: string;
}

export interface RampQuotesReceived {
  currency_source: string;
  currency_destination: string;
  payment_method_id: string;
  refresh_count: number;
  results_count: number;
  average_total_fee: number;
  average_gas_fee: number;
  average_processing_fee: number;
  average_total_fee_of_amount: number;
}

interface OnRampQuotesReceived extends RampQuotesReceived {
  amount: number;
  average_crypto_out: number;
  chain_id_destination: string;
  provider_onramp_list: string[];
  provider_onramp_first: string;
  provider_onramp_last?: string;
}
interface OffRampQuotesReceived extends RampQuotesReceived {
  crypto_amount: number;
  average_fiat_out: number;
  chain_id_source: string;
  provider_offramp_list: string[];
  provider_offramp_first: string;
  provider_offramp_last?: string;
}

export interface RampProviderSelected {
  provider_onramp: string;
  refresh_count: number;
  quote_position: number;
  results_count: number;
  crypto_out: number;
  currency_source: string;
  currency_destination: string;
  chain_id_destination: string;
  payment_method_id: string;
  total_fee: number;
  gas_fee: number;
  processing_fee: number;
  exchange_rate: number;
}

interface OnRampProviderSelected extends RampProviderSelected {
  provider_onramp: string;
  crypto_out: number;
  chain_id_destination: string;
}
interface OffRampProviderSelected extends RampProviderSelected {
  provider_offramp: string;
  fiat_out: number;
  currency_source: string;
  currency_destination: string;
  chain_id_destination: string;
}

export interface OnRampProviderDetailsViewed {
  provider_onramp: string;
}
export interface OffRampProviderDetailsViewed {
  provider_offramp: string;
}

export interface RampDirectProviderClicked {
  region: string;
  currency_source: string;
  currency_destination: string;
  payment_method_id: string;
}

interface OnRampDirectProviderClicked extends RampDirectProviderClicked {
  provider_onramp: string;
  chain_id_destination: string;
}
interface OffRampDirectProviderClicked extends RampDirectProviderClicked {
  provider_offramp: string;
  chain_id_source: string;
}

export interface RampPurchaseSubmitted {
  payment_method_id: string;
  currency_source: string;
  currency_destination: string;
  order_type: string;
  is_apple_pay: boolean;
}

interface OnRampPurchaseSubmitted extends RampPurchaseSubmitted {
  fiat_amount: number;
  crypto_out: number;
  provider_onramp: string;
  chain_id_destination: string;
  has_zero_currency_destination_balance: boolean;
  has_zero_native_balance?: boolean;
}

interface OffRampPurchaseSubmitted extends RampPurchaseSubmitted {
  crypto_amount: number;
  fiat_out: number;
  provider_offramp: string;
  chain_id_source: string;
}

export interface RampPurchaseCompleted {
  currency_source: string;
  currency_destination: string;
  order_type: string;
  total_fee: number;
  exchange_rate: number;
  payment_method_id: string;
  gas_fee?: number;
  processing_fee?: number;
}
interface OnRampPurchaseCompleted extends RampPurchaseCompleted {
  amount: number;
  crypto_out: number;
  chain_id_destination: string;
  provider_onramp: string;
}

interface OffRampPurchaseCompleted extends RampPurchaseCompleted {
  crypto_amount: number;
  fiat_out: number;
  chain_id_source: string;
  provider_offramp: string;
}

export interface RampPurchaseFailed {
  currency_source: string;
  currency_destination: string;
  order_type: string;
  payment_method_id: string;
}

interface OnRampPurchaseFailed extends RampPurchaseFailed {
  amount: number;
  chain_id_destination: string;
  provider_onramp: string;
}

interface OffRampPurchaseFailed extends RampPurchaseFailed {
  crypto_amount: number;
  chain_id_source: string;
  provider_offramp: string;
}
interface OnRampPurchaseCanceled extends OnRampPurchaseFailed {}
interface OffRampPurchaseCanceled extends OffRampPurchaseFailed {}

export interface RampPurchaseDetailsViewed {
  purchase_status: string;
  payment_method_id: string;
  currency_destination: string;
  order_type: string;
  currency_source: string;
}

interface OnRampPurchaseDetailsViewed extends RampPurchaseDetailsViewed {
  provider_onramp: string;
  chain_id_destination: string;
}
interface OffRampPurchaseDetailsViewed extends RampPurchaseDetailsViewed {
  provider_offramp: string;
  chain_id_source: string;
}

export interface RampExternalLinkClicked {
  location: ScreenLocation;
  text:
    | 'Etherscan Transaction'
    | 'Provider Order Tracking'
    | 'Provider Homepage'
    | 'Provider Support'
    | 'Provider Privacy Policy'
    | 'Provider Terms of Service';
  url_domain: string;
}

export interface RampQuoteError {
  currency_source: string;
  currency_destination: string;
  payment_method_id: string;
  error_message?: string;
}
interface OnRampQuoteError extends RampQuoteError {
  amount: number;
  provider_onramp: string;
  chain_id_destination: string;
}

interface OffRampQuoteError extends RampQuoteError {
  crypto_amount: number;
  provider_offramp: string;
  chain_id_source: string;
}

export interface RampError {
  location: ScreenLocation;
  message: string;
  payment_method_id?: string;
  region?: string;
  currency_source?: string;
  currency_destination?: string;
}

export interface EventTypes {
  BUY_BUTTON_CLICKED: BuyButtonClicked;
  SELL_BUTTON_CLICKED: SellButtonClicked;

  ONRAMP_REGION_SELECTED: OnrampRegionSelected;
  OFFRAMP_REGION_SELECTED: OfframpRegionSelected;

  ONRAMP_REGION_RESET: RampRegionReset;
  OFFRAMP_REGION_RESET: RampRegionReset;

  ONRAMP_PAYMENT_METHOD_SELECTED: RampPaymentMethodSelected;
  OFFRAMP_PAYMENT_METHOD_SELECTED: RampPaymentMethodSelected;

  ONRAMP_CONTINUE_TO_AMOUNT_CLICKED: RampContinueToAmountClicked;
  OFFRAMP_CONTINUE_TO_AMOUNT_CLICKED: RampContinueToAmountClicked;

  ONRAMP_QUOTES_REQUESTED: OnRampQuoteRequested;
  OFFRAMP_QUOTES_REQUESTED: OffRampQuoteRequested;

  ONRAMP_CANCELED: OnrampCanceled;
  OFFRAMP_CANCELED: OfframpCanceled;

  ONRAMP_QUOTES_RECEIVED: OnRampQuotesReceived;
  OFFRAMP_QUOTES_RECEIVED: OffRampQuotesReceived;

  ONRAMP_PROVIDER_SELECTED: OnRampProviderSelected;
  OFFRAMP_PROVIDER_SELECTED: OffRampProviderSelected;

  ONRAMP_PROVIDER_DETAILS_VIEWED: OnRampProviderDetailsViewed;
  OFFRAMP_PROVIDER_DETAILS_VIEWED: OffRampProviderDetailsViewed;

  ONRAMP_DIRECT_PROVIDER_CLICKED: OnRampDirectProviderClicked;
  OFFRAMP_DIRECT_PROVIDER_CLICKED: OffRampDirectProviderClicked;

  ONRAMP_PURCHASE_SUBMITTED: OnRampPurchaseSubmitted;
  OFFRAMP_PURCHASE_SUBMITTED: OffRampPurchaseSubmitted;

  ONRAMP_PURCHASE_COMPLETED: OnRampPurchaseCompleted;
  OFFRAMP_PURCHASE_COMPLETED: OffRampPurchaseCompleted;

  ONRAMP_PURCHASE_FAILED: OnRampPurchaseFailed;
  OFFRAMP_PURCHASE_FAILED: OfframpCanceled;

  ONRAMP_PURCHASE_CANCELLED: OnRampPurchaseCanceled;
  OFFRAMP_PURCHASE_CANCELLED: OffRampPurchaseCanceled;

  ONRAMP_PURCHASE_DETAILS_VIEWED: OnRampPurchaseDetailsViewed;
  OFFRAMP_PURCHASE_DETAILS_VIEWED: OffRampPurchaseDetailsViewed;

  ONRAMP_EXTERNAL_LINK_CLICKED: RampExternalLinkClicked;
  OFFRAMP_EXTERNAL_LINK_CLICKED: RampExternalLinkClicked;

  ONRAMP_QUOTE_ERROR: OnRampQuoteError;
  OFFRAMP_QUOTE_ERROR: OffRampQuoteError;

  ONRAMP_ERROR: RampError;
  OFFRAMP_ERROR: RampError;

  // after redirection events will go here
}

export type AnalyticsEvents = {
  [K in keyof typeof MetaMetricsEvents]: K extends keyof EventTypes
    ? EventTypes[K]
    : never;
};
