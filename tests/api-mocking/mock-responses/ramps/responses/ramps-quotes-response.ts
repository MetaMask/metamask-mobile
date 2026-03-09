/* eslint-disable @metamask/design-tokens/color-no-hex */

// Single transak-staging quote using debit-credit-card payment method.
// The controller's startQuotePolling() sends providers: [selectedProvider.id],
// so the real API returns exactly 1 quote. With success.length === 1 the
// controller auto-selects it (RampsController.mjs:952).
// Returning multiple quotes breaks auto-selection and leaves the Continue
// button disabled.

export type ProviderType = 'native' | 'aggregator';

export const createRampsQuoteResponse = (
  providerType: ProviderType = 'native',
) => ({
  success: [
    {
      provider: '/providers/transak-staging',
      url: null,
      method: null,
      headers: null,
      quote: {
        crypto: {
          id: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
          idv2: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
          legacyId: '/currencies/crypto/1/eth',
          network: {
            active: true,
            chainId: '1',
            chainName: 'Ethereum Mainnet',
            shortName: 'Ethereum',
          },
          logo: 'https://uat-static.cx.metamask.io/api/v1/tokenIcons/1/0x0000000000000000000000000000000000000000.png',
          decimals: 18,
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
        },
        cryptoId:
          '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
        fiat: {
          id: '/currencies/fiat/usd',
          symbol: 'USD',
          name: 'US Dollar',
          decimals: 2,
          denomSymbol: '$',
        },
        fiatId: '/currencies/fiat/usd',
        amountIn: providerType === 'native' ? 100 : 15,
        amountOut: providerType === 'native' ? 0.02455598 : 0.00355373,
        exchangeRate: 4072.34318439678,
        networkFee: 0.02,
        providerFee: providerType === 'native' ? 23.33 : 3.5,
        extraFee: 0,
        receiver: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
        paymentMethod: '/payments/debit-credit-card',
        cryptoTranslation: 'ETHethereum',
        buyURL:
          'https://on-ramp.uat-api.cx.metamask.io/v2/providers/transak-staging/buy',
      },
      nativeApplePay: {},
      providerInfo: {
        id: '/providers/transak-staging',
        name: 'Transak (Staging)',
        type: providerType,
        environmentType: 'STAGING',
        description:
          'Per Transak: "The fastest and securest way to buy 100+ cryptocurrencies on 75+ blockchains. Pay via Apple Pay, UPI, bank transfer or use your debit or credit card. Trusted by 2+ million global users. Transak empowers wallets, gaming, DeFi, NFTs, Exchanges, and DAOs across 125+ countries."',
        hqAddress:
          '35 Shearing Street, Bury St. Edmunds, IP32 6FE, United Kingdom',
        links: [
          {
            name: 'Homepage',
            url: 'https://www.transak.com/',
          },
          {
            name: 'Privacy Policy',
            url: 'https://transak.com/privacy-policy',
          },
          {
            name: 'Support',
            url: 'https://support.transak.com/hc/en-us',
          },
        ],
        logos: {
          light: '/assets/providers/transak_light.png',
          dark: '/assets/providers/transak_dark.png',
          height: 24,
          width: 90,
        },
        features: {
          buy: {
            enabled: true,
            userAgent: null,
            padCustomOrderId: false,
            orderCustomId: '',
            browser: null,
            orderCustomIdRequired: false,
            orderCustomIdExpiration: null,
            orderCustomIdSeparator: null,
            orderCustomIdPrefixes: ['c-', ''],
            supportedByBackend: true,
            redirection: 'JSON_REDIRECTION',
          },
          quotes: {
            enabled: false,
            supportedByBackend: false,
          },
          sell: {
            enabled: true,
          },
          sellQuotes: {
            enabled: true,
          },
          recurringBuy: {},
        },
      },
      providerQuote: {
        paymentMethod: ['credit_debit_card'],
        fiatCurrency: 'USD',
        cryptoCurrency: 'ETHethereum',
      },
      metadata: {
        reliability: 0.6578456951,
        tags: {},
      },
    },
  ],
  sorted: [
    {
      sortBy: '2',
      ids: ['/providers/transak-staging'],
    },
    {
      sortBy: '1',
      ids: ['/providers/transak-staging'],
    },
  ],
  error: [],
  customActions: [],
});
