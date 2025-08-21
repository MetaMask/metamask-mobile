import { Mockttp } from 'mockttp';
import { TestSpecificMock } from '../../framework/types';

/**
 * Mock responses for ramps API calls
 * Used in E2E tests to avoid dependency on external APIs
 */

const MOCK_QUOTES_RESPONSE = {
  quotes: [
    {
      provider: {
        id: '/providers/moonpay-staging',
        name: 'MoonPay (Staging)',
        logos: {
          light:
            'https://on-ramp.dev-api.cx.metamask.io/assets/providers/moonpay_light.png',
          dark: 'https://on-ramp.dev-api.cx.metamask.io/assets/providers/moonpay_dark.png',
          height: 24,
          width: 88,
        },
        features: {
          buy: {
            enabled: true,
            browser: 'APP_BROWSER',
            supportedByBackend: true,
            redirection: 'JSON_REDIRECTION',
          },
          quotes: {
            enabled: true,
            supportedByBackend: false,
          },
        },
      },
      crypto: {
        id: '/currencies/crypto/1/eth',
        symbol: 'ETH',
        decimals: 18,
        network: {
          chainId: '1',
          chainName: 'Ethereum Mainnet',
        },
      },
      fiat: {
        id: '/currencies/fiat/eur',
        symbol: 'EUR',
        decimals: 2,
      },
      amountIn: 100,
      amountOut: 0.035,
      networkFee: 2.5,
      providerFee: 1.5,
      error: false,
      tags: { isBestRate: true, isMostReliable: true },
      exchangeRate: 2857.14,
      amountOutInFiat: 97.5,
    },
    {
      provider: {
        id: '/providers/banxa-staging',
        name: 'Banxa (Staging)',
        logos: {
          light:
            'https://on-ramp.dev-api.cx.metamask.io/assets/providers/banxa_light.png',
          dark: 'https://on-ramp.dev-api.cx.metamask.io/assets/providers/banxa_dark.png',
          height: 24,
          width: 65,
        },
        features: {
          buy: {
            enabled: true,
            browser: 'APP_BROWSER',
            supportedByBackend: true,
            redirection: 'JSON_REDIRECTION',
          },
          quotes: {
            enabled: true,
            supportedByBackend: false,
          },
        },
      },
      crypto: {
        id: '/currencies/crypto/1/eth',
        symbol: 'ETH',
        decimals: 18,
        network: {
          chainId: '1',
          chainName: 'Ethereum Mainnet',
        },
      },
      fiat: {
        id: '/currencies/fiat/eur',
        symbol: 'EUR',
        decimals: 2,
      },
      amountIn: 100,
      amountOut: 0.034,
      networkFee: 3.0,
      providerFee: 2.0,
      error: false,
      tags: { isBestRate: false, isMostReliable: false },
      exchangeRate: 2941.18,
      amountOutInFiat: 95.0,
    },
  ],
  sorted: [],
  customActions: [],
};

const MOCK_SELL_QUOTES_RESPONSE = {
  quotes: [
    {
      provider: {
        id: '/providers/moonpay-staging',
        name: 'MoonPay (Staging)',
        logos: {
          light:
            'https://on-ramp.dev-api.cx.metamask.io/assets/providers/moonpay_light.png',
          dark: 'https://on-ramp.dev-api.cx.metamask.io/assets/providers/moonpay_dark.png',
          height: 24,
          width: 88,
        },
        features: {
          sell: {
            enabled: true,
          },
          sellQuotes: {
            enabled: true,
          },
        },
      },
      crypto: {
        id: '/currencies/crypto/1/eth',
        symbol: 'ETH',
        decimals: 18,
        network: {
          chainId: '1',
          chainName: 'Ethereum Mainnet',
        },
      },
      fiat: {
        id: '/currencies/fiat/eur',
        symbol: 'EUR',
        decimals: 2,
      },
      amountIn: 0.1,
      amountOut: 280,
      networkFee: 2.5,
      providerFee: 1.5,
      error: false,
      tags: { isBestRate: true, isMostReliable: true },
      exchangeRate: 2800,
      amountOutInFiat: 280,
    },
  ],
  sorted: [],
  customActions: [],
};

const MOCK_LIMITS_RESPONSE = {
  minAmount: 20,
  maxAmount: 10000,
};

const MOCK_SELL_LIMITS_RESPONSE = {
  minAmount: 0.01,
  maxAmount: 10,
};

const MOCK_PAYMENT_METHODS_RESPONSE = [
  {
    id: '/payments/credit-debit-card',
    name: 'Credit/Debit Card',
    description: 'Pay with your credit or debit card',
  },
  {
    id: '/payments/bank-transfer',
    name: 'Bank Transfer',
    description: 'Pay via bank transfer',
  },
];

const MOCK_SELL_PAYMENT_METHODS_RESPONSE = [
  {
    id: '/payments/bank-transfer',
    name: 'Bank Transfer',
    description: 'Receive funds via bank transfer',
  },
];

const MOCK_FIAT_CURRENCIES_RESPONSE = [
  {
    id: '/currencies/fiat/eur',
    symbol: 'EUR',
    name: 'Euro',
    decimals: 2,
  },
  {
    id: '/currencies/fiat/usd',
    symbol: 'USD',
    name: 'US Dollar',
    decimals: 2,
  },
];

const MOCK_DEFAULT_FIAT_CURRENCY_RESPONSE = {
  id: '/currencies/fiat/eur',
  symbol: 'EUR',
  name: 'Euro',
  decimals: 2,
};

const MOCK_CRYPTO_CURRENCIES_RESPONSE = [
  {
    id: '/currencies/crypto/1/eth',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    network: {
      chainId: '1',
      chainName: 'Ethereum Mainnet',
    },
  },
];

const MOCK_REGIONS_RESPONSE = [
  {
    id: '/regions/fr',
    name: 'France',
    emoji: '🇫🇷',
    currencies: ['/currencies/fiat/eur'],
    support: { buy: true, sell: true, recurringBuy: true },
    unsupported: false,
    recommended: false,
    detected: false,
  },
  {
    id: '/regions/us-ca',
    name: 'California',
    emoji: '🇺🇸',
    currencies: ['/currencies/fiat/usd'],
    support: { buy: true, sell: true, recurringBuy: true },
    unsupported: false,
    recommended: false,
    detected: false,
  },
];

export const testSpecificMock: TestSpecificMock = async (
  mockServer: Mockttp,
) => {
  // Mock getQuotes for buy
  await mockServer
    .forGet(/on-ramp\.dev-api\.cx\.metamask\.io.*\/quotes$/)
    .thenReply(200, JSON.stringify(MOCK_QUOTES_RESPONSE));

  // Mock getSellQuotes for sell
  await mockServer
    .forGet(/on-ramp\.dev-api\.cx\.metamask\.io.*\/sell-quotes$/)
    .thenReply(200, JSON.stringify(MOCK_SELL_QUOTES_RESPONSE));

  // Mock getLimits for buy
  await mockServer
    .forGet(/on-ramp\.dev-api\.cx\.metamask\.io.*\/limits$/)
    .thenReply(200, JSON.stringify(MOCK_LIMITS_RESPONSE));

  // Mock getSellLimits for sell
  await mockServer
    .forGet(/on-ramp\.dev-api\.cx\.metamask\.io.*\/sell-limits$/)
    .thenReply(200, JSON.stringify(MOCK_SELL_LIMITS_RESPONSE));

  // Mock getPaymentMethods for buy
  await mockServer
    .forGet(/on-ramp\.dev-api\.cx\.metamask\.io.*\/payment-methods$/)
    .thenReply(200, JSON.stringify(MOCK_PAYMENT_METHODS_RESPONSE));

  // Mock getSellPaymentMethods for sell
  await mockServer
    .forGet(/on-ramp\.dev-api\.cx\.metamask\.io.*\/sell-payment-methods$/)
    .thenReply(200, JSON.stringify(MOCK_SELL_PAYMENT_METHODS_RESPONSE));

  // Mock getFiatCurrencies for buy and sell
  await mockServer
    .forGet(/on-ramp\.dev-api\.cx\.metamask\.io.*\/fiat-currencies$/)
    .thenReply(200, JSON.stringify(MOCK_FIAT_CURRENCIES_RESPONSE));

  // Mock getDefaultFiatCurrency for buy and sell
  await mockServer
    .forGet(/on-ramp\.dev-api\.cx\.metamask\.io.*\/default.*fiat-currency$/)
    .thenReply(200, JSON.stringify(MOCK_DEFAULT_FIAT_CURRENCY_RESPONSE));

  // Mock getCryptoCurrencies for buy and sell
  await mockServer
    .forGet(/on-ramp\.dev-api\.cx\.metamask\.io.*\/crypto-currencies$/)
    .thenReply(200, JSON.stringify(MOCK_CRYPTO_CURRENCIES_RESPONSE));

  // Mock regions endpoint
  await mockServer
    .forGet(/on-ramp\.dev-api\.cx\.metamask\.io\/regions$/)
    .thenReply(200, JSON.stringify(MOCK_REGIONS_RESPONSE));

  // Mock orders endpoint
  await mockServer
    .forPost(/on-ramp\.dev-api\.cx\.metamask\.io\/orders/)
    .thenReply(
      200,
      JSON.stringify({
        id: 'mock-order-id',
        status: 'PENDING',
        provider: '/providers/moonpay-staging',
      }),
    );
};
