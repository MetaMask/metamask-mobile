export type ScreenLocation =
  | 'Amount to Buy Screen'
  | 'Amount to Sell Screen'
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
  text: 'Buy' | 'Buy Native Token' | 'Sell' | 'Get Started';
  location: string;
  region?: string;
}

interface RampRegionSelected {
  location?: ScreenLocation;
  country_id: string;
  state_id?: string;
  is_unsupported_onramp?: boolean;
  is_unsupported_offramp?: boolean;
}

interface RampRegionReset {
  location?: ScreenLocation;
}

interface RampPaymentMethodSelected {
  payment_method_id: string;
  available_payment_method_ids: string[];
  region?: string;
  location?: ScreenLocation;
}

interface RampContinueToAmountClicked {
  payment_method_id: string;
  available_payment_method_ids: string[];
  region: string;
  location: ScreenLocation;
}

interface RampQuoteRequested {
  currency_source: string;
  currency_destination: string;
  payment_method_id: string;
  amount: number | string;
  location: ScreenLocation;
}

interface OnRampQuoteRequested extends RampQuoteRequested {
  chain_id_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
}

interface OffRampQuoteRequested extends RampQuoteRequested {
  chain_id_source: string;
  currency_source_symbol?: string;
  currency_source_network?: string;
}

interface RampCanceled {
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

interface RampQuotesReceived {
  amount: number | string;
  currency_source: string;
  currency_destination: string;
  payment_method_id: string;
  refresh_count: number;
  results_count: number;
  average_total_fee: number;
  average_gas_fee: number;
  average_processing_fee: number;
  average_total_fee_of_amount: number;
  quotes_amount_list: number[];
  quotes_amount_first: number;
  quotes_amount_last?: number;
}

interface OnRampQuotesReceived extends RampQuotesReceived {
  average_crypto_out: number;
  chain_id_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  provider_onramp_list: string[];
  provider_onramp_first: string;
  provider_onramp_last?: string;
  provider_onramp_most_reliable?: string;
  provider_onramp_best_price?: string;
}
interface OffRampQuotesReceived extends RampQuotesReceived {
  average_fiat_out: number;
  chain_id_source: string;
  currency_source_symbol?: string;
  currency_source_network?: string;
  provider_offramp_list: string[];
  provider_offramp_first: string;
  provider_offramp_last?: string;
  provider_offramp_most_reliable?: string;
  provider_offramp_best_price?: string;
}

interface RampProviderSelected {
  refresh_count: number;
  quote_position: number;
  results_count: number;
  currency_source: string;
  currency_destination: string;
  payment_method_id: string;
  total_fee: number;
  gas_fee: number;
  processing_fee: number;
  exchange_rate: number;
  amount: number | string;
  is_most_reliable: boolean;
  is_best_rate: boolean;
  is_recommended: boolean;
}

interface OnRampProviderSelected extends RampProviderSelected {
  provider_onramp: string;
  crypto_out: number;
  chain_id_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
}
interface OffRampProviderSelected extends RampProviderSelected {
  provider_offramp: string;
  fiat_out: number;
  chain_id_source: string;
  currency_source_symbol?: string;
  currency_source_network?: string;
}

interface OnRampProviderDetailsViewed {
  provider_onramp: string;
}
interface OffRampProviderDetailsViewed {
  provider_offramp: string;
}

interface RampDirectProviderClicked {
  region: string;
  currency_source: string;
  currency_destination: string;
  payment_method_id: string;
}

interface OnRampDirectProviderClicked extends RampDirectProviderClicked {
  provider_onramp: string;
  chain_id_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
}
interface OffRampDirectProviderClicked extends RampDirectProviderClicked {
  provider_offramp: string;
  chain_id_source: string;
  currency_source_symbol?: string;
  currency_source_network?: string;
}

interface RampPurchaseSubmitted {
  payment_method_id: string;
  currency_source: string;
  currency_destination: string;
  order_type: string;
  is_apple_pay: boolean;
}

interface OnRampPurchaseSubmitted extends RampPurchaseSubmitted {
  provider_onramp: string;
  chain_id_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  has_zero_currency_destination_balance: boolean;
  has_zero_native_balance?: boolean;
}

interface OffRampPurchaseSubmitted extends RampPurchaseSubmitted {
  provider_offramp: string;
  chain_id_source: string;
  currency_source_symbol?: string;
  currency_source_network?: string;
}
interface RampPurchase {
  amount: number;
  currency_source: string;
  currency_destination: string;
  order_type: string;
  payment_method_id: string;
}

interface RampPurchaseCompleted extends RampPurchase {
  total_fee: number;
  exchange_rate: number;
  gas_fee?: number;
  processing_fee?: number;
  amount_in_usd: number;
}

interface OnRampPurchaseCompleted extends RampPurchaseCompleted {
  crypto_out: number;
  chain_id_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  provider_onramp: string;
}

interface OffRampPurchaseCompleted extends RampPurchaseCompleted {
  fiat_out: number;
  chain_id_source: string;
  currency_source_symbol?: string;
  currency_source_network?: string;
  provider_offramp: string;
}

interface OnRampPurchaseFailed extends RampPurchase {
  chain_id_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  provider_onramp: string;
}

interface OffRampPurchaseFailed extends RampPurchase {
  chain_id_source: string;
  currency_source_symbol?: string;
  currency_source_network?: string;
  provider_offramp: string;
}

export type OnRampPurchaseCanceled = OnRampPurchaseFailed;
export type OffRampPurchaseCanceled = OffRampPurchaseFailed;

interface RampPurchaseDetailsViewed {
  status: string;
  payment_method_id: string;
  currency_destination: string;
  order_type: string;
  currency_source: string;
}

interface OnRampPurchaseDetailsViewed extends RampPurchaseDetailsViewed {
  provider_onramp: string;
  chain_id_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
}
interface OffRampPurchaseDetailsViewed extends RampPurchaseDetailsViewed {
  provider_offramp: string;
  chain_id_source: string;
  currency_source_symbol?: string;
  currency_source_network?: string;
}

interface RampExternalLinkClicked {
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

interface RampQuoteError {
  amount: number | string;
  currency_source: string;
  currency_destination: string;
  payment_method_id: string;
  error_message?: string;
}
interface OnRampQuoteError extends RampQuoteError {
  provider_onramp: string;
  chain_id_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
}

interface OffRampQuoteError extends RampQuoteError {
  provider_offramp: string;
  chain_id_source: string;
  currency_source_symbol?: string;
  currency_source_network?: string;
}

interface RampError {
  location: ScreenLocation;
  message: string;
  payment_method_id?: string;
  region?: string;
  currency_source?: string;
  currency_destination?: string;
}

interface RampTransaction {
  crypto_amount: string;
  chain_id_source: number;
  currency_source_symbol?: string;
  currency_source_network?: string;
  fiat_out: number;
  payment_method_id: string;
  currency_source: string;
  currency_destination: string;
  order_id?: string;
  provider_offramp: string;
}

interface RampQuotesExpanded {
  payment_method_id: string;
  currency_source: string;
  currency_destination: string;
  amount: number | string;
  refresh_count: number;
  results_count: number;
  previously_used_count: number;
}

interface OnRampQuotesExpanded extends RampQuotesExpanded {
  chain_id_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
}

interface OffRampQuotesExpanded extends RampQuotesExpanded {
  chain_id_source: string;
  currency_source_symbol?: string;
  currency_source_network?: string;
}

export interface AnalyticsEvents {
  RAMP_REGION_SELECTED: RampRegionSelected;
  RAMP_REGION_RESET: RampRegionReset;

  ONRAMP_GET_STARTED_CLICKED: RampButtonClicked;
  OFFRAMP_GET_STARTED_CLICKED: RampButtonClicked;

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

  ONRAMP_QUOTES_EXPANDED: OnRampQuotesExpanded;
  OFFRAMP_QUOTES_EXPANDED: OffRampQuotesExpanded;

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

  ONRAMP_QUOTE_ERROR: OnRampQuoteError;
  OFFRAMP_QUOTE_ERROR: OffRampQuoteError;

  ONRAMP_ERROR: RampError;
  OFFRAMP_ERROR: RampError;

  OFFRAMP_SEND_CRYPTO_PROMPT_VIEWED: RampTransaction;
  OFFRAMP_SEND_TRANSACTION_INVOKED: RampTransaction;
  OFFRAMP_SEND_TRANSACTION_CONFIRMED: RampTransaction;
  OFFRAMP_SEND_TRANSACTION_REJECTED: RampTransaction;
}
