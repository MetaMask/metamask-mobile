import { UnifiedRampRoutingType } from '../../../../../reducers/fiatOrders';

interface RampsButtonClicked {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT' | 'SELL' | 'BUY' | 'UNIFIED BUY';
  user_id?: string;
  region: string;
  location: string;
  ramp_routing?: UnifiedRampRoutingType;
  is_authenticated?: boolean;
  preferred_provider?: string;
  order_count?: number;
}

interface RampsDepositCashButtonClicked {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  region: string;
  location: string;
  is_authenticated: boolean;
}

interface RampsPaymentMethodSelected {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  region: string;
  payment_method_id: string;
  is_authenticated: boolean;
}

interface RampsTokenSelected {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT' | 'SELL' | 'BUY' | 'UNIFIED BUY';
  user_id?: string;
  region: string;
  chain_id: string;
  currency_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  currency_source: string;
  is_authenticated: boolean;
  token_caip19?: string;
  token_symbol?: string;
  ramp_routing?: UnifiedRampRoutingType;
}

interface RampsRegionSelected {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  region: string;
  is_authenticated: boolean;
}

interface RampsOrderProposed {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  amount_source: number;
  amount_destination: number;
  payment_method_id: string;
  region: string;
  chain_id: string;
  currency_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  currency_source: string;
  is_authenticated: boolean;
  first_time_order?: boolean;
}

interface RampsOrderSelected {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  amount_source: number;
  amount_destination: number;
  exchange_rate: number;
  gas_fee: number;
  processing_fee: number;
  total_fee: number;
  payment_method_id: string;
  region: string;
  chain_id: string;
  currency_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  currency_source: string;
}

interface RampsOrderFailed {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  amount_source: number;
  amount_destination: number;
  payment_method_id: string;
  region: string;
  chain_id: string;
  currency_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  currency_source: string;
  error_message: string;
  is_authenticated: boolean;
}

interface RampsEmailSubmitted {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
}

interface RampsOtpConfirmed {
  quote_session_id?: string;
  region: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
}

interface RampsOtpFailed {
  quote_session_id?: string;
  region: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
}

interface RampsOtpResent {
  quote_session_id?: string;
  region: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
}

interface RampsKycStarted {
  quote_session_id?: string;
  region: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  kyc_type: string;
}

interface RampsBasicInfoEntered {
  quote_session_id?: string;
  region: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  kyc_type: string;
}

interface RampsAddressEntered {
  quote_session_id?: string;
  region: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  kyc_type: string;
}

interface RampsTransactionConfirmed {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  amount_source: number;
  amount_destination: number;
  exchange_rate: number;
  gas_fee: number;
  processing_fee: number;
  total_fee: number;
  payment_method_id: string;
  country: string;
  chain_id: string;
  currency_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  currency_source: string;
}

interface RampsTransactionCompleted {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  amount_source: number;
  amount_destination: number;
  exchange_rate: number;
  gas_fee: number;
  processing_fee: number;
  total_fee: number;
  payment_method_id: string;
  country: string;
  chain_id: string;
  currency_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  currency_source: string;
}

interface RampsTransactionFailed {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  amount_source: number;
  amount_destination: number;
  exchange_rate: number;
  gas_fee: number;
  processing_fee: number;
  total_fee: number;
  payment_method_id: string;
  country: string;
  chain_id: string;
  currency_destination: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  currency_source: string;
  error_message: string;
}

interface RampsKycApplicationFailed {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  kyc_type: string;
}

interface RampsKycApplicationApproved {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  kyc_type: string;
}

interface RampsPaymentMethodAdded {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  payment_method_id: string;
}

interface RampsTokenSelectorClicked {
  quote_session_id?: string;
  ramp_type: 'DEPOSIT';
  user_id?: string;
  region?: string;
  location: string;
  chain_id?: string;
  currency_destination?: string;
  currency_destination_symbol?: string;
  currency_destination_network?: string;
  currency_source?: string;
  is_authenticated: boolean;
}

interface RampsUserDetailsFetched {
  logged_in: boolean;
  region: string;
  location: string;
}

export interface AnalyticsEvents {
  RAMPS_BUTTON_CLICKED: RampsButtonClicked;
  RAMPS_DEPOSIT_CASH_BUTTON_CLICKED: RampsDepositCashButtonClicked;
  RAMPS_PAYMENT_METHOD_SELECTED: RampsPaymentMethodSelected;
  RAMPS_PAYMENT_METHOD_ADDED: RampsPaymentMethodAdded;
  RAMPS_TOKEN_SELECTOR_CLICKED: RampsTokenSelectorClicked;
  RAMPS_TOKEN_SELECTED: RampsTokenSelected;
  RAMPS_REGION_SELECTED: RampsRegionSelected;
  RAMPS_ORDER_PROPOSED: RampsOrderProposed;
  RAMPS_ORDER_SELECTED: RampsOrderSelected;
  RAMPS_ORDER_FAILED: RampsOrderFailed;
  RAMPS_EMAIL_SUBMITTED: RampsEmailSubmitted;
  RAMPS_OTP_CONFIRMED: RampsOtpConfirmed;
  RAMPS_OTP_FAILED: RampsOtpFailed;
  RAMPS_OTP_RESENT: RampsOtpResent;
  RAMPS_KYC_STARTED: RampsKycStarted;
  RAMPS_BASIC_INFO_ENTERED: RampsBasicInfoEntered;
  RAMPS_ADDRESS_ENTERED: RampsAddressEntered;
  RAMPS_TRANSACTION_CONFIRMED: RampsTransactionConfirmed;
  RAMPS_TRANSACTION_COMPLETED: RampsTransactionCompleted;
  RAMPS_TRANSACTION_FAILED: RampsTransactionFailed;
  RAMPS_KYC_APPLICATION_FAILED: RampsKycApplicationFailed;
  RAMPS_KYC_APPLICATION_APPROVED: RampsKycApplicationApproved;
  RAMPS_USER_DETAILS_FETCHED: RampsUserDetailsFetched;
}
