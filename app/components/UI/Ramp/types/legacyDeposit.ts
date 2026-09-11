import type { CaipAssetReference, CaipChainId } from '@metamask/utils';

/** Local types formerly imported from `@consensys/native-ramps-sdk`. */

export enum SdkEnvironment {
  Development = 'dev',
  Staging = 'stg',
  Production = 'prod',
}

export enum DepositOrderType {
  Deposit = 'DEPOSIT',
}

export enum DepositPaymentMethodDuration {
  instant = 'instant',
  oneToTwoDays = '1_to_2_days',
}

export const OrderStatusEnum = {
  Unknown: 'UNKNOWN',
  Precreated: 'PRECREATED',
  Created: 'CREATED',
  Pending: 'PENDING',
  Failed: 'FAILED',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
  IdExpired: 'ID_EXPIRED',
} as const;

export type OrderStatusEnum =
  (typeof OrderStatusEnum)[keyof typeof OrderStatusEnum];

export interface DepositRegion {
  isoCode: string;
  flag: string;
  name: string;
  phone: {
    prefix: string;
    placeholder: string;
    template: string;
  };
  currency: string;
  supported: boolean;
  recommended?: boolean;
  geolocated?: boolean;
}

export interface DepositPaymentMethod {
  id: string;
  name: string;
  shortName?: string;
  duration: DepositPaymentMethodDuration;
  icon: string;
  iconColor?: {
    light: string;
    dark: string;
  };
  isManualBankTransfer?: boolean;
}

export interface DepositNetwork {
  name: string;
  chainId: string;
}

export interface DepositCryptoCurrency {
  assetId: CaipAssetReference;
  name: string;
  chainId: CaipChainId;
  decimals: number;
  iconUrl: string;
  symbol: string;
}

export interface NativeTransakAccessToken {
  accessToken: string;
  ttl: number;
  created: Date;
}

export interface NativeTransakUserDetailsKycDetails {
  status: string;
  type: string;
  attempts: unknown[];
  highestApprovedKYCType: string | null;
  kycMarkedBy: string | null;
  kycResult: string | null;
  rejectionDetails: unknown | null;
  userId: string;
  workFlowRunId: string;
}

export interface NativeTransakUserDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  status: string;
  dob: string;
  kyc: NativeTransakUserDetailsKycDetails;
  address: {
    addressLine1: string;
    addressLine2: string;
    state: string;
    city: string;
    postCode: string;
    country: string;
    countryCode: string;
  };
  createdAt: string;
}

export interface BuyQuote {
  quoteId: string;
  conversionPrice: number;
  marketConversionPrice: number;
  slippage: number;
  fiatCurrency: string;
  cryptoCurrency: string;
  paymentMethod: string;
  fiatAmount: number;
  cryptoAmount: number;
  isBuyOrSell: string;
  network: string;
  feeDecimal: number;
  totalFee: number;
  feeBreakdown: unknown[];
  nonce: number;
  cryptoLiquidityProvider: string;
  notes: unknown[];
}

export interface DepositOrder {
  id: string;
  provider: string;
  cryptoAmount: number | string;
  fiatAmount: number;
  cryptoCurrency: DepositCryptoCurrency;
  fiatCurrency: string;
  providerOrderId: string;
  providerOrderLink: string;
  createdAt: number;
  paymentMethod: DepositPaymentMethod;
  totalFeesFiat: number;
  txHash: string;
  walletAddress: string;
  status: OrderStatusEnum;
  network: DepositNetwork;
  timeDescriptionPending: string;
  fiatAmountInUsd: number;
  feesInUsd: number;
  region: DepositRegion;
  orderType: DepositOrderType.Deposit;
  exchangeRate?: number;
  statusDescription?: string;
  paymentDetails: {
    fiatCurrency: string;
    paymentMethod: string;
    fields: { name: string; id: string; value: string }[];
  }[];
  partnerFees?: number;
  networkFees?: number;
}
