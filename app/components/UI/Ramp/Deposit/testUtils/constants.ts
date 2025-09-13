/**
 * Shared test constants for Deposit components
 * This file centralizes all hardcoded test data that was previously duplicated across test files
 */

import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import {
  DepositOrderType,
  BuyQuote,
  DepositOrder,
} from '@consensys/native-ramps-sdk';
import {
  type DepositRegion,
  type DepositCryptoCurrency,
  type DepositPaymentMethod,
  DepositPaymentMethodDuration,
} from '@consensys/native-ramps-sdk/dist/Deposit';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

// ====== REGIONS ======

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

export const MOCK_USDC_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: 'eip155:1',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
};

export const MOCK_USDT_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
  chainId: 'eip155:1',
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
};

export const MOCK_BTC_TOKEN: DepositCryptoCurrency = {
  assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
  chainId: 'bip122:000000000019d6689c085ae165831e93',
  name: 'Bitcoin',
  symbol: 'BTC',
  decimals: 8,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
};

export const MOCK_ETH_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  name: 'Ethereum',
  symbol: 'ETH',
  decimals: 18,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
};

export const MOCK_CRYPTOCURRENCIES: DepositCryptoCurrency[] = [
  MOCK_USDC_TOKEN,
  MOCK_USDT_TOKEN,
  MOCK_BTC_TOKEN,
  MOCK_ETH_TOKEN,
];

// ====== PAYMENT METHODS ======

export const MOCK_CREDIT_DEBIT_CARD: DepositPaymentMethod = {
  id: 'credit_debit_card',
  name: 'Debit or Credit',
  duration: DepositPaymentMethodDuration.instant,
  icon: IconName.Card,
};

export const MOCK_APPLE_PAY: DepositPaymentMethod = {
  id: 'apple_pay',
  name: 'Apple Pay',
  duration: DepositPaymentMethodDuration.instant,
  icon: IconName.Apple,
  iconColor: {
    light: '#000000',
    dark: '#FFFFFF',
  },
};

export const MOCK_PAYMENT_METHODS: DepositPaymentMethod[] = [
  MOCK_CREDIT_DEBIT_CARD,
  MOCK_APPLE_PAY,
];

// ====== QUOTES ======

export const MOCK_BUY_QUOTE: BuyQuote = {
  quoteId: 'test-quote-id',
  fiatAmount: 100,
  fiatCurrency: 'USD',
  cryptoAmount: 0.05,
  cryptoCurrency: 'USDC',
  networkFees: 1.25,
  partnerFees: 1.25,
  totalFeesFiat: 2.5,
  paymentMethod: 'credit_debit_card',
  network: 'ethereum',
  walletAddress: '0x1234567890123456789012345678901234567890',
  provider: 'test-provider',
};

// ====== ORDERS ======

export const MOCK_DEPOSIT_ORDER: Partial<DepositOrder> = {
  id: 'test-order-id',
  provider: 'test-provider',
  createdAt: 1673886669608,
  fiatAmount: 100,
  totalFeesFiat: 2.5,
  cryptoAmount: 0.05,
  cryptoCurrency: 'USDC',
  fiatCurrency: 'USD',
  network: 'ethereum',
  status: 'COMPLETED',
  orderType: DepositOrderType.Deposit,
  walletAddress: '0x1234567890123456789012345678901234567890',
  txHash: '0x987654321',
  exchangeRate: 2000,
  networkFees: 1.25,
  partnerFees: 1.25,
  paymentMethod: 'credit_debit_card',
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
    cryptoCurrency: 'USDC',
    network: 'ethereum',
    status: 'created',
    orderType: 'buy',
    walletAddress: '0x123...',
    paymentMethod: 'sepa_bank_transfer',
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

// ====== SDK RETURN VALUES ======

export const createMockSDKReturn = (overrides = {}) => ({
  isAuthenticated: false,
  selectedWalletAddress: '0x1234567890123456789012345678901234567890',
  selectedRegion: MOCK_US_REGION,
  setSelectedRegion: jest.fn(),
  selectedPaymentMethod: MOCK_CREDIT_DEBIT_CARD,
  setSelectedPaymentMethod: jest.fn(),
  selectedCryptoCurrency: MOCK_USDC_TOKEN,
  setSelectedCryptoCurrency: jest.fn(),
  ...overrides,
});

// ====== HOOK RETURN VALUES ======

export const MOCK_USE_REGIONS_RETURN = {
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

// ====== ANALYTICS PAYLOAD ======

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
    cryptoCurrency: 'USDC',
    network: 'ethereum',
    fiatAmount: '100',
    exchangeRate: '2000',
    totalFeesFiat: '2.50',
    networkFees: '1.25',
    partnerFees: '1.25',
    paymentMethod: 'credit_debit_card',
    fiatCurrency: 'USD',
  },
};

// ====== CONSTANTS ======

export const FIXED_DATE = new Date(2024, 0, 1);
export const FIXED_TIMESTAMP = FIXED_DATE.getTime();

export const DEFAULT_WALLET_ADDRESS =
  '0x1234567890123456789012345678901234567890';
export const TEST_QUOTE_ID = 'test-quote-id';
export const TEST_ORDER_ID = 'test-order-id';
export const TEST_PROVIDER = 'test-provider';

// ====== ERROR STATES ======

export const MOCK_USE_REGIONS_ERROR = {
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

// ====== LOADING STATES ======

export const MOCK_USE_REGIONS_LOADING = {
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

// ====== EMPTY STATES ======

export const MOCK_USE_REGIONS_EMPTY = {
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
