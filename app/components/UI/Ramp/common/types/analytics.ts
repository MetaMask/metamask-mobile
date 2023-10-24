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

export interface RampButtonClicked {
  text: 'Buy' | 'Buy Native Token';
  location: string;
  chain_id_destination: string;
}

export interface RampRegionSelected {
  is_unsupported: boolean;
  country_onramp_id: string;
  state_onramp_id?: string;
  location?: ScreenLocation;
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

export interface RampCOnrampContinueToAmountClicked {
  payment_method_id: string;
  available_payment_method_ids: string[];
  region: string;
  location: ScreenLocation;
}

export interface RampQuoteRequested {
  currency_source: string;
  currency_destination: string;
  payment_method_id: string;
  chain_id_destination: string;
  amount: number;
  location: ScreenLocation;
}

export interface RampCanceled {
  location: ScreenLocation;
  chain_id_destination: string;
  provider_onramp?: string;
  results_count?: number;
}

export interface RampQuotesReceived {
  currency_source: string;
  currency_destination: string;
  chain_id_destination: string;
  amount: number;
  payment_method_id: string;
  refresh_count: number;
  results_count: number;
  average_crypto_out: number;
  average_total_fee: number;
  average_gas_fee: number;
  average_processing_fee: number;
  provider_onramp_list: string[];
  provider_onramp_first: string;
  average_total_fee_of_amount: number;
  provider_onramp_last?: string;
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

export interface RampProviderDetailsViewed {
  provider_onramp: string;
}

export interface RampDirectProviderClicked {
  region: string;
  provider_onramp: string;
  currency_source: string;
  currency_destination: string;
  chain_id_destination: string;
  payment_method_id: string;
}

export interface RampPurchaseSubmitted {
  provider_onramp: string;
  payment_method_id: string;
  currency_source: string;
  currency_destination: string;
  chain_id_destination: string;
  order_type: string;
  has_zero_native_balance?: boolean;
  is_apple_pay: boolean;
}

export interface RampPurchaseCompleted {
  crypto_out: number;
  amount: number;
  currency_source: string;
  currency_destination: string;
  chain_id_destination: string;
  order_type: string;
  total_fee: number;
  exchange_rate: number;
  payment_method_id: string;
  provider_onramp: string;
  gas_fee?: number;
  processing_fee?: number;
}

export interface RampPurchaseFailed {
  currency_source: string;
  amount: number;
  currency_destination: string;
  chain_id_destination: string;
  order_type: string;
  payment_method_id: string;
  provider_onramp: string;
}

export interface RampPurchaseCancelled {
  currency_source: string;
  amount: number;
  currency_destination: string;
  chain_id_destination: string;
  order_type?: string;
  payment_method_id: string;
  provider_onramp: string;
}

export interface RampPurchaseDetailsViewed {
  purchase_status: string;
  provider_onramp: string;
  payment_method_id: string;
  currency_destination: string;
  chain_id_destination: string;
  order_type: string;
  currency_source: string;
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
  provider_onramp: string;
  currency_source: string;
  currency_destination: string;
  chain_id_destination: string;
  payment_method_id: string;
  error_message?: string;
  amount: number;
}

export interface RampError {
  location: ScreenLocation;
  message: string;
  payment_method_id?: string;
  region?: string;
  currency_source?: string;
  currency_destination?: string;
}

export interface AnalyticsEvents {
  BUY_BUTTON_CLICKED: RampButtonClicked;
  SELL_BUTTON_CLICKED: RampButtonClicked;

  ONRAMP_REGION_SELECTED: RampRegionSelected;
  OFFRAMP_REGION_SELECTED: RampRegionSelected;

  ONRAMP_REGION_RESET: RampRegionReset;
  OFFRAMP_REGION_RESET: RampRegionReset;

  ONRAMP_PAYMENT_METHOD_SELECTED: RampPaymentMethodSelected;
  OFFRAMP_PAYMENT_METHOD_SELECTED: RampPaymentMethodSelected;

  ONRAMP_CONTINUE_TO_AMOUNT_CLICKED: RampCOnrampContinueToAmountClicked;
  OFFRAMP_CONTINUE_TO_AMOUNT_CLICKED: RampCOnrampContinueToAmountClicked;

  ONRAMP_QUOTES_REQUESTED: RampQuoteRequested;
  OFFRAMP_QUOTES_REQUESTED: RampQuoteRequested;

  ONRAMP_CANCELED: RampCanceled;
  OFFRAMP_CANCELED: RampCanceled;

  ONRAMP_QUOTES_RECEIVED: RampQuotesReceived;
  OFFRAMP_QUOTES_RECEIVED: RampQuotesReceived;

  ONRAMP_PROVIDER_SELECTED: RampProviderSelected;
  OFFRAMP_PROVIDER_SELECTED: RampProviderSelected;

  ONRAMP_PROVIDER_DETAILS_VIEWED: RampProviderDetailsViewed;
  OFFRAMP_PROVIDER_DETAILS_VIEWED: RampProviderDetailsViewed;

  ONRAMP_DIRECT_PROVIDER_CLICKED: RampDirectProviderClicked;
  OFFRAMP_DIRECT_PROVIDER_CLICKED: RampDirectProviderClicked;

  ONRAMP_PURCHASE_SUBMITTED: RampPurchaseSubmitted;
  OFFRAMP_PURCHASE_SUBMITTED: RampPurchaseSubmitted;

  ONRAMP_PURCHASE_COMPLETED: RampPurchaseCompleted;
  OFFRAMP_PURCHASE_COMPLETED: RampPurchaseCompleted;

  ONRAMP_PURCHASE_FAILED: RampPurchaseFailed;
  OFFRAMP_PURCHASE_FAILED: RampPurchaseFailed;

  ONRAMP_PURCHASE_CANCELLED: RampPurchaseCancelled;
  OFFRAMP_PURCHASE_CANCELLED: RampPurchaseCancelled;

  ONRAMP_PURCHASE_DETAILS_VIEWED: RampPurchaseDetailsViewed;
  OFFRAMP_PURCHASE_DETAILS_VIEWED: RampPurchaseDetailsViewed;

  ONRAMP_EXTERNAL_LINK_CLICKED: RampExternalLinkClicked;
  OFFRAMP_EXTERNAL_LINK_CLICKED: RampExternalLinkClicked;

  ONRAMP_QUOTE_ERROR: RampQuoteError;
  OFFRAMP_QUOTE_ERROR: RampQuoteError;

  ONRAMP_ERROR: RampError;
  OFFRAMP_ERROR: RampError;
}
