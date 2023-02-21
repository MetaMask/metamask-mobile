export type ScreenLocation =
  | 'Amount to Buy Screen'
  | 'Payment Method Screen'
  | 'Region Screen'
  | 'Quotes Screen'
  | 'Provider Webview'
  | 'Provider InApp Browser'
  | 'Get Started Screen'
  | 'Order Details Screen'
  | 'Settings Screen';

export interface AnalyticsEvents {
  BUY_BUTTON_CLICKED: {
    text: 'Buy' | 'Buy Native Token';
    location: string;
    chain_id_destination: string;
  };
  ONRAMP_REGION_SELECTED: {
    is_unsupported: boolean;
    country_onramp_id: string;
    state_onramp_id?: string;
    location?: ScreenLocation;
  };
  ONRAMP_REGION_RESET: {
    location?: ScreenLocation;
  };
  ONRAMP_PAYMENT_METHOD_SELECTED: {
    payment_method_id: string;
    location?: ScreenLocation;
  };
  ONRAMP_QUOTES_REQUESTED: {
    currency_source: string;
    currency_destination: string;
    payment_method_id: string;
    chain_id_destination: string;
    amount: number;
    location: ScreenLocation;
  };
  ONRAMP_CANCELED: {
    location: ScreenLocation;
    chain_id_destination: string;
    provider_onramp?: string;
    results_count?: number;
  };
  ONRAMP_QUOTES_RECEIVED: {
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
  };
  ONRAMP_PROVIDER_SELECTED: {
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
  };
  ONRAMP_PROVIDER_DETAILS_VIEWED: {
    provider_onramp: string;
  };
  ONRAMP_DIRECT_PROVIDER_CLICKED: {
    region: string;
    provider_onramp: string;
    currency_source: string;
    currency_destination: string;
    chain_id_destination: string;
    payment_method_id: string;
  };
  ONRAMP_PURCHASE_SUBMITTED: {
    provider_onramp: string;
    payment_method_id: string;
    currency_source: string;
    currency_destination: string;
    chain_id_destination: string;
    order_type: string;
    has_zero_native_balance?: boolean;
    is_apple_pay: boolean;
  };
  ONRAMP_PURCHASE_COMPLETED: {
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
  };
  ONRAMP_PURCHASE_FAILED: {
    currency_source: string;
    amount: number;
    currency_destination: string;
    chain_id_destination: string;
    order_type: string;
    payment_method_id: string;
    provider_onramp: string;
  };
  ONRAMP_PURCHASE_CANCELLED: {
    currency_source: string;
    amount: number;
    currency_destination: string;
    chain_id_destination: string;
    order_type?: string;
    payment_method_id: string;
    provider_onramp: string;
  };
  ONRAMP_PURCHASE_DETAILS_VIEWED: {
    purchase_status: string;
    provider_onramp: string;
    payment_method_id: string;
    currency_destination: string;
    chain_id_destination: string;
    order_type: string;
    currency_source: string;
  };
  ONRAMP_EXTERNAL_LINK_CLICKED: {
    location: ScreenLocation;
    text:
      | 'Etherscan Transaction'
      | 'Provider Order Tracking'
      | 'Provider Homepage'
      | 'Provider Support'
      | 'Provider Privacy Policy'
      | 'Provider Terms of Service';
    url_domain: string;
  };
  ONRAMP_QUOTE_ERROR: {
    provider_onramp: string;
    currency_source: string;
    currency_destination: string;
    chain_id_destination: string;
    payment_method_id: string;
    error_message?: string;
    amount: number;
  };
  ONRAMP_ERROR: {
    location: ScreenLocation;
    message: string;
    payment_method_id?: string;
    region?: string;
    currency_source?: string;
    currency_destination?: string;
  };
}
