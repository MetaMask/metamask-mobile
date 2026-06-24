import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import {
  DepositOrderType,
  BuyQuote,
  DepositOrder,
  type DepositRegion,
  type DepositPaymentMethod,
  DepositPaymentMethodDuration,
  NativeTransakUserDetails,
  NativeTransakUserDetailsKycDetails,
} from '@consensys/native-ramps-sdk';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import type { DepositSDK } from '../sdk';
import {
  MOCK_USDC_TOKEN,
  MOCK_USDT_TOKEN,
  MOCK_BTC_TOKEN,
  MOCK_ETH_TOKEN,
  MOCK_USDC_SOLANA_TOKEN,
  MOCK_CRYPTOCURRENCIES,
} from '../constants/mockCryptoCurrencies';

export const MOCK_US_REGION: DepositRegion = {
  isoCode: 'US',
  flag: '🇺🇸',
  name: 'United States',
  currency: 'USD',
  phone: {
    prefix: '+1',
    placeholder: '(555) 123-4567',
    template: '(###) ###-####',
  },
  supported: true,
};

export const MOCK_EUR_REGION: DepositRegion = {
  isoCode: 'DE',
  flag: '🇩🇪',
  name: 'Germany',
  currency: 'EUR',
  phone: {
    prefix: '+49',
    placeholder: '30 12345678',
    template: '## ########',
  },
  supported: true,
};

export const MOCK_CA_REGION: DepositRegion = {
  isoCode: 'CA',
  flag: '🇨🇦',
  name: 'Canada',
  currency: 'CAD',
  phone: {
    prefix: '+1',
    placeholder: '(555) 123-4567',
    template: '(###) ###-####',
  },
  supported: true,
};

export const MOCK_UNSUPPORTED_REGION: DepositRegion = {
  isoCode: 'XX',
  flag: '🏳️',
  name: 'Unsupported Country',
  currency: 'USD',
  supported: false,
  phone: {
    prefix: '+1',
    placeholder: '(555) 123-4567',
    template: '(###) ###-####',
  },
};

export const MOCK_FR_REGION: DepositRegion = {
  isoCode: 'FR',
  flag: '🇫🇷',
  name: 'France',
  phone: {
    prefix: '+33',
    placeholder: '1 23 45 67 89',
    template: 'X XX XX XX XX',
  },
  currency: 'EUR',
  supported: true,
};

export const MOCK_REGIONS: DepositRegion[] = [MOCK_US_REGION, MOCK_EUR_REGION];

export const MOCK_REGIONS_EXTENDED: DepositRegion[] = [
  { ...MOCK_US_REGION, recommended: true },
  MOCK_EUR_REGION,
  { ...MOCK_CA_REGION, supported: false },
  MOCK_FR_REGION,
];

// ====== CRYPTOCURRENCIES ======
// Re-exported from constants/mockCryptoCurrencies.ts
export {
  MOCK_USDC_TOKEN,
  MOCK_USDT_TOKEN,
  MOCK_BTC_TOKEN,
  MOCK_ETH_TOKEN,
  MOCK_USDC_SOLANA_TOKEN,
  MOCK_CRYPTOCURRENCIES,
};

export const MOCK_CREDIT_DEBIT_CARD: DepositPaymentMethod = {
  id: 'credit_debit_card',
  name: 'Debit or Credit',
  duration: DepositPaymentMethodDuration.instant,
  icon: IconName.Card,
};

export const MOCK_SEPA_BANK_TRANSFER_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'sepa_bank_transfer',
  name: 'SEPA Bank Transfer',
  shortName: 'SEPA',
  duration: DepositPaymentMethodDuration.oneToTwoDays,
  icon: IconName.Bank,
};

export const MOCK_APPLE_PAY: DepositPaymentMethod = {
  id: 'apple_pay',
  name: 'Apple Pay',
  duration: DepositPaymentMethodDuration.instant,
  icon: IconName.Apple,
  iconColor: {
    light: 'var(--color-icon-default)',
    dark: 'var(--color-icon-default)',
  },
};

export const MOCK_PAYMENT_METHODS: DepositPaymentMethod[] = [
  MOCK_CREDIT_DEBIT_CARD,
  MOCK_APPLE_PAY,
];

export const MOCK_BUY_QUOTE: BuyQuote = {
  quoteId: 'test-quote-id',
  conversionPrice: 2000,
  marketConversionPrice: 2000,
  slippage: 0.01,
  fiatCurrency: 'USD',
  cryptoCurrency: 'USDC',
  paymentMethod: 'credit_debit_card',
  fiatAmount: 100,
  cryptoAmount: 0.05,
  isBuyOrSell: 'buy',
  network: 'eip155:1',
  feeDecimal: 0.025,
  totalFee: 2.5,
  feeBreakdown: [],
  nonce: 12345,
  cryptoLiquidityProvider: 'test-provider',
  notes: [],
};

export const MOCK_DEPOSIT_ORDER: Partial<DepositOrder> = {
  id: 'test-order-id',
  provider: 'test-provider',
  createdAt: 1673886669608,
  fiatAmount: 100,
  totalFeesFiat: 2.5,
  cryptoAmount: 0.05,
  cryptoCurrency: MOCK_USDC_TOKEN,
  fiatCurrency: 'USD',
  network: { chainId: 'eip155:1', name: 'Ethereum' },
  status: 'COMPLETED',
  orderType: DepositOrderType.Deposit,
  walletAddress: '0x1234567890123456789012345678901234567890',
  txHash: '0x987654321',
  exchangeRate: 2000,
  networkFees: 1.25,
  partnerFees: 1.25,
  paymentMethod: MOCK_CREDIT_DEBIT_CARD,
};

export const MOCK_BANK_DETAILS_ORDER = {
  id: 'test-order-id',
  state: FIAT_ORDER_STATES.CREATED,
  data: {
    id: 'deposit-order-id',
    provider: 'test-provider',
    createdAt: Date.now(),
    fiatAmount: 100,
    fiatCurrency: 'USD',
    cryptoCurrency: MOCK_USDC_TOKEN,
    network: { chainId: 'eip155:1', name: 'Ethereum' },
    status: 'created',
    orderType: 'buy',
    walletAddress: '0x123...',
    paymentMethod: {
      id: 'sepa_bank_transfer',
      name: 'SEPA Bank Transfer',
      duration: DepositPaymentMethodDuration.oneToTwoDays,
      icon: IconName.Bank,
    },
    paymentDetails: [
      {
        fiatCurrency: 'USD',
        paymentMethod: 'sepa_bank_transfer',
        fields: [
          { name: 'Amount', value: '$100.00', id: 'amount' },
          { name: 'First Name (Beneficiary)', value: 'john', id: 'firstName' },
          { name: 'Last Name (Beneficiary)', value: 'doe', id: 'lastName' },
          { name: 'Account Number', value: '1234567890', id: 'accountNumber' },
          { name: 'Bank Name', value: 'test bank', id: 'bankName' },
          {
            name: 'Recipient Address',
            value: '456 recipient street',
            id: 'recipientAddress',
          },
          { name: 'Bank Address', value: '123 bank street', id: 'bankAddress' },
        ],
      },
    ],
  },
};

export const createMockSDKReturn = (overrides = {}): DepositSDK => ({
  sdk: undefined,
  sdkError: undefined,
  providerApiKey: null,
  isAuthenticated: false,
  authToken: undefined,
  setAuthToken: jest.fn().mockResolvedValue(true),
  logoutFromProvider: jest.fn().mockResolvedValue(undefined),
  checkExistingToken: jest.fn().mockResolvedValue(false),
  selectedWalletAddress: '0x1234567890123456789012345678901234567890',
  selectedRegion: MOCK_US_REGION,
  setSelectedRegion: jest.fn(),
  selectedPaymentMethod: MOCK_CREDIT_DEBIT_CARD,
  setSelectedPaymentMethod: jest.fn(),
  selectedCryptoCurrency: MOCK_USDC_TOKEN,
  setSelectedCryptoCurrency: jest.fn(),
  intent: undefined,
  setIntent: jest.fn(),
  ...overrides,
});

export const MOCK_USE_REGIONS_RETURN = {
  userRegionLocked: false,
  regions: MOCK_REGIONS,
  error: null,
  isFetching: false,
  retryFetchRegions: jest.fn(),
};

export const MOCK_USE_CRYPTOCURRENCIES_RETURN = {
  cryptoCurrencies: MOCK_CRYPTOCURRENCIES,
  error: null,
  isFetching: false,
  retryFetchCryptoCurrencies: jest.fn(),
};

export const MOCK_USE_PAYMENT_METHODS_RETURN = {
  paymentMethods: MOCK_PAYMENT_METHODS,
  error: null,
  isFetching: false,
  retryFetchPaymentMethods: jest.fn(),
};

export const MOCK_USE_DEPOSIT_TOKEN_EXCHANGE_RETURN = {
  tokenAmount: '0.05',
  isLoadingTokenAmount: false,
  errorLoadingTokenAmount: null,
};

export const MOCK_USE_ACCOUNT_TOKEN_COMPATIBLE_RETURN = {
  isAccountTokenCompatible: true,
  isLoadingAccountTokenCompatible: false,
  errorLoadingAccountTokenCompatible: null,
};

export const MOCK_USE_DEPOSIT_SDK_METHOD_RETURN = {
  data: null,
  error: null as string | null,
  isFetching: false,
};

export const MOCK_ANALYTICS_DEPOSIT_ORDER = {
  id: '123',
  provider: 'DEPOSIT',
  createdAt: Date.now(),
  account: '0x1234567890123456789012345678901234567890',
  excludeFromPurchases: false,
  orderType: DepositOrderType.Deposit,
  amount: '100',
  currency: 'USD',
  cryptoAmount: '0.05',
  cryptocurrency: 'USDC',
  fee: '2.50',
  state: FIAT_ORDER_STATES.COMPLETED,
  network: 'eip155:1',
  data: {
    provider: 'TRANSAK',
    cryptoCurrency: MOCK_USDC_TOKEN,
    network: { chainId: 'eip155:1', name: 'Ethereum' },
    fiatAmount: '100',
    exchangeRate: '2000',
    totalFeesFiat: '2.50',
    networkFees: '1.25',
    partnerFees: '1.25',
    paymentMethod: MOCK_CREDIT_DEBIT_CARD,
    fiatCurrency: 'USD',
  },
};

export const FIXED_DATE = new Date(2024, 0, 1);
export const FIXED_TIMESTAMP = FIXED_DATE.getTime();

export const DEFAULT_WALLET_ADDRESS =
  '0x1234567890123456789012345678901234567890';
export const TEST_QUOTE_ID = 'test-quote-id';
export const TEST_ORDER_ID = 'test-order-id';
export const TEST_PROVIDER = 'test-provider';

export const MOCK_USE_REGIONS_ERROR = {
  userRegionLocked: false,
  regions: null,
  error: 'Failed to fetch regions',
  isFetching: false,
  retryFetchRegions: jest.fn(),
};

export const MOCK_USE_CRYPTOCURRENCIES_ERROR = {
  cryptoCurrencies: null,
  error: 'Failed to fetch cryptos',
  isFetching: false,
  retryFetchCryptoCurrencies: jest.fn(),
};

export const MOCK_USE_PAYMENT_METHODS_ERROR = {
  paymentMethods: null,
  error: 'Failed to fetch payment methods',
  isFetching: false,
  retryFetchPaymentMethods: jest.fn(),
};

export const MOCK_USE_REGIONS_LOADING = {
  userRegionLocked: false,
  regions: null,
  error: null,
  isFetching: true,
  retryFetchRegions: jest.fn(),
};

export const MOCK_USE_CRYPTOCURRENCIES_LOADING = {
  cryptoCurrencies: null,
  error: null,
  isFetching: true,
  retryFetchCryptoCurrencies: jest.fn(),
};

export const MOCK_USE_PAYMENT_METHODS_LOADING = {
  paymentMethods: null,
  error: null,
  isFetching: true,
  retryFetchPaymentMethods: jest.fn(),
};

export const MOCK_USE_REGIONS_EMPTY = {
  userRegionLocked: false,
  regions: [],
  error: null,
  isFetching: false,
  retryFetchRegions: jest.fn(),
};

export const MOCK_USE_CRYPTOCURRENCIES_EMPTY = {
  cryptoCurrencies: [],
  error: null,
  isFetching: false,
  retryFetchCryptoCurrencies: jest.fn(),
};

export const MOCK_USE_PAYMENT_METHODS_EMPTY = {
  paymentMethods: [],
  error: null,
  isFetching: false,
  retryFetchPaymentMethods: jest.fn(),
};

export const MOCK_USER_DETAILS_DEFAULT = {
  id: 'user-id',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  mobileNumber: '1234567890',
  status: 'active',
  dob: '1990-01-01',
  kyc: {
    l1: {
      status: 'APPROVED',
      type: 'BASIC',
      updatedAt: '2023-01-01',
      kycSubmittedAt: '2023-01-01',
    },
  } as unknown as NativeTransakUserDetailsKycDetails,
  createdAt: '2023-01-01',
  isKycApproved: jest.fn().mockReturnValue(true),
};

export const MOCK_USER_DETAILS_US = {
  ...MOCK_USER_DETAILS_DEFAULT,
  id: 'user-id-us',
  address: {
    addressLine1: '123 Main St',
    addressLine2: '',
    state: 'CA',
    city: 'San Francisco',
    postCode: '94101',
    country: 'United States',
    countryCode: 'US',
  },
} as NativeTransakUserDetails;

export const MOCK_USER_DETAILS_FR = {
  ...MOCK_USER_DETAILS_DEFAULT,
  id: 'user-id-fr',
  address: {
    addressLine1: '123 Rue de la Paix',
    addressLine2: '',
    state: 'Île-de-France',
    city: 'Paris',
    postCode: '75001',
    country: 'France',
    countryCode: 'FR',
  },
} as NativeTransakUserDetails;

export const MOCK_USE_DEPOSIT_USER_RETURN = {
  userDetails: null,
  error: null,
  isFetching: false,
  fetchUserDetails: jest.fn(),
};

export const MOCK_USE_DEPOSIT_USER_ERROR = {
  userDetails: null,
  error: 'Failed to fetch user details',
  isFetching: false,
  fetchUserDetails: jest.fn(),
};
