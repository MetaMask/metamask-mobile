import { TestSpecificMock } from '../../framework/types';

/**
 * Mock responses for ramps API calls
 * Used in E2E tests to avoid dependency on external APIs
 */

/**
 * Get ramps API mocks with realistic responses for buy and sell flows
 * @returns {RampsApiMocks} Object containing GET and POST mocks for ramps APIs
 */
export const getRampsApiMocks = (): TestSpecificMock => ({
  GET: [
    // Mock getQuotes for buy - more flexible URL matching
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/payment-methods/credit-debit-card/crypto-currencies/1/eth/fiat-currencies/eur/quotes',
      response: {
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
      },
      responseCode: 200,
    },
    // Mock getSellQuotes for sell - more flexible URL matching
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/payment-methods/credit-debit-card/crypto-currencies/1/eth/fiat-currencies/eur/sell-quotes',
      response: {
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
      },
      responseCode: 200,
    },
    // Mock getLimits for buy
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/payment-methods/credit-debit-card/crypto-currencies/1/eth/fiat-currencies/eur/limits',
      response: {
        minAmount: 20,
        maxAmount: 10000,
      },
      responseCode: 200,
    },
    // Mock getSellLimits for sell
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/payment-methods/credit-debit-card/crypto-currencies/1/eth/fiat-currencies/eur/sell-limits',
      response: {
        minAmount: 0.01,
        maxAmount: 10,
      },
      responseCode: 200,
    },
    // Mock getPaymentMethods for buy
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/crypto-currencies/1/eth/fiat-currencies/eur/payment-methods',
      response: [
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
      ],
      responseCode: 200,
    },
    // Mock getSellPaymentMethods for sell
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/crypto-currencies/1/eth/fiat-currencies/eur/sell-payment-methods',
      response: [
        {
          id: '/payments/bank-transfer',
          name: 'Bank Transfer',
          description: 'Receive funds via bank transfer',
        },
      ],
      responseCode: 200,
    },
    // Mock getFiatCurrencies for buy
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/payment-methods/credit-debit-card/fiat-currencies',
      response: [
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
      ],
      responseCode: 200,
    },
    // Mock getSellFiatCurrencies for sell
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/payment-methods/bank-transfer/fiat-currencies',
      response: [
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
      ],
      responseCode: 200,
    },
    // Mock getDefaultFiatCurrency for buy
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/default-fiat-currency',
      response: {
        id: '/currencies/fiat/eur',
        symbol: 'EUR',
        name: 'Euro',
        decimals: 2,
      },
      responseCode: 200,
    },
    // Mock getDefaultSellFiatCurrency for sell
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/default-sell-fiat-currency',
      response: {
        id: '/currencies/fiat/eur',
        symbol: 'EUR',
        name: 'Euro',
        decimals: 2,
      },
      responseCode: 200,
    },
    // Mock getCryptoCurrencies for buy
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/payment-methods/credit-debit-card/fiat-currencies/eur/crypto-currencies',
      response: [
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
      ],
      responseCode: 200,
    },
    // Mock getSellCryptoCurrencies for sell
    {
      urlEndpoint:
        'https://on-ramp.dev-api.cx.metamask.io/regions/fr/payment-methods/bank-transfer/fiat-currencies/eur/crypto-currencies',
      response: [
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
      ],
      responseCode: 200,
    },
    // Mock regions endpoint
    {
      urlEndpoint: 'https://on-ramp.dev-api.cx.metamask.io/regions',
      response: [
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
      ],
      responseCode: 200,
    },
  ],
  POST: [
    // Mock analytics tracking
    {
      urlEndpoint: 'https://api.segment.io/v1/track',
      response: { success: true },
      responseCode: 200,
    },
    // Mock any other POST endpoints that might be called
    {
      urlEndpoint: 'https://on-ramp.dev-api.cx.metamask.io/orders',
      response: {
        id: 'mock-order-id',
        status: 'PENDING',
        provider: '/providers/moonpay-staging',
      },
      responseCode: 200,
    },
  ],
});
