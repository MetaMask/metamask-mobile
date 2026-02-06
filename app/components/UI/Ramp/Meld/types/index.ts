/**
 * Meld White-Label API Types
 *
 * Types match the ACTUAL Meld API v2025-03-04 response shapes.
 *
 * @see https://docs.meld.io/docs/whitelabel-api-guide
 */

// ──────────────────────────────────────────────
// Countries & Regions
// ──────────────────────────────────────────────

export interface MeldCountry {
  countryCode: string;
  name: string;
  flagImageUrl: string | null;
  regions: string[] | null;
}

export interface MeldCountryDefaults {
  countryCode: string;
  defaultCurrencyCode: string;
  defaultPaymentMethods: string[];
}

// ──────────────────────────────────────────────
// Currencies
// ──────────────────────────────────────────────

export interface MeldFiatCurrency {
  currencyCode: string;
  name: string;
  symbolImageUrl: string | null;
}

export interface MeldCryptoCurrency {
  currencyCode: string;
  name: string;
  chainCode: string;
  chainName: string;
  chainId: string | null;
  contractAddress: string | null;
  symbolImageUrl: string | null;
}

// ──────────────────────────────────────────────
// Payment Methods
// ──────────────────────────────────────────────

export type MeldPaymentMethodType =
  | 'CREDIT_DEBIT_CARD'
  | 'BANK_TRANSFER'
  | 'APPLE_PAY'
  | 'GOOGLE_PAY'
  | 'PIX'
  | 'SEPA'
  | 'ACH'
  | 'BINANCE_CASH_BALANCE'
  | string;

export interface MeldPaymentMethod {
  paymentMethod: MeldPaymentMethodType;
  name: string;
  paymentType: string;
  logos: {
    dark: string;
    light: string;
  } | null;
}

// ──────────────────────────────────────────────
// Purchase Limits
// ──────────────────────────────────────────────

export interface MeldPurchaseLimits {
  [currencyCode: string]: {
    minAmount: number;
    maxAmount: number;
    dailyLimit?: number;
    monthlyLimit?: number;
  };
}

// ──────────────────────────────────────────────
// Quotes
// ──────────────────────────────────────────────

export interface MeldQuoteRequest {
  sourceAmount?: string;
  destinationAmount?: string;
  sourceCurrencyCode: string;
  destinationCurrencyCode: string;
  countryCode: string;
  paymentMethodType?: MeldPaymentMethodType;
  walletAddress?: string;
}

export interface MeldQuote {
  transactionType: 'CRYPTO_PURCHASE' | 'CRYPTO_SELL';
  sourceAmount: number;
  sourceAmountWithoutFees: number;
  fiatAmountWithoutFees: number;
  destinationAmountWithoutFees: number | null;
  sourceCurrencyCode: string;
  countryCode: string;
  totalFee: number;
  networkFee: number;
  transactionFee: number;
  destinationAmount: number;
  destinationCurrencyCode: string;
  exchangeRate: number;
  paymentMethodType: MeldPaymentMethodType;
  customerScore: number;
  serviceProvider: string;
  institutionName: string | null;
  lowKyc: boolean | null;
  partnerFee: number;
}

export interface MeldQuoteResponse {
  quotes: MeldQuote[];
  message: string | null;
  error: string | null;
  timestamp: string | null;
}

// ──────────────────────────────────────────────
// Widget Session
// ──────────────────────────────────────────────

export interface MeldWidgetSessionRequest {
  sessionData: {
    walletAddress: string;
    countryCode: string;
    sourceCurrencyCode: string;
    sourceAmount: string;
    destinationCurrencyCode: string;
    serviceProvider: string;
    paymentMethodType?: MeldPaymentMethodType;
    redirectUrl?: string;
  };
  sessionType: 'BUY' | 'SELL';
  externalCustomerId?: string;
  externalSessionId?: string;
}

export interface MeldWidgetSession {
  id: string;
  externalSessionId: string | null;
  externalCustomerId: string | null;
  customerId: string;
  widgetUrl: string;
  token: string;
}

// ──────────────────────────────────────────────
// Transactions
// ──────────────────────────────────────────────

export type MeldTransactionStatus =
  | 'PENDING'
  | 'SETTLING'
  | 'SETTLED'
  | 'FAILED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface MeldTransaction {
  id: string;
  externalSessionId: string | null;
  externalCustomerId: string | null;
  status: MeldTransactionStatus;
  sourceAmount: number;
  sourceCurrencyCode: string;
  destinationAmount: number;
  destinationCurrencyCode: string;
  serviceProvider: string;
  transactionType: 'CRYPTO_PURCHASE' | 'CRYPTO_SELL';
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// Internal PoC types
// ──────────────────────────────────────────────

export enum MeldEnvironment {
  Sandbox = 'sandbox',
  Production = 'production',
}

export interface MeldConfig {
  apiKey: string;
  environment: MeldEnvironment;
}
