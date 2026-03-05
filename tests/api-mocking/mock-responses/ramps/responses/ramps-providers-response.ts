// Providers V2 response — staging providers: Transak (native) + MoonPay (aggregator).
// Transak uses the native SDK flow; MoonPay uses the WebView/widget aggregator flow.
// Note: provider.type here is informational catalog metadata. Flow routing is NOT
// driven by this field — it is determined at the quote level (quote.providerInfo.type).
// determinePreferredProvider() auto-selects Transak (matches "transak" in id/name).
export const RAMPS_PROVIDERS_RESPONSE = {
  providers: [
    {
      id: '/providers/transak-staging',
      name: 'Transak (Staging)',
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
      type: 'native',
      supportedCryptoCurrencies: {
        'eip155:1/slip44:60': true,
      },
      supportedFiatCurrencies: {
        '/currencies/fiat/eur': true,
        '/currencies/fiat/usd': true,
      },
      supportedPaymentMethods: {
        '/payments/debit-credit-card': true,
        '/payments/apple-pay': true,
      },
    },
    {
      id: '/providers/moonpay-staging',
      name: 'Moonpay (Staging)',
      environmentType: 'STAGING',
      description:
        'Per MoonPay: "MoonPay provides a smooth experience for converting between fiat currencies and cryptocurrencies. Easily top-up with ETH, BNB and more directly in your MetaMask wallet via MoonPay using all major payment methods including debit and credit card, local bank transfers, Apple Pay, Google Pay, and Samsung Pay. MoonPay is active in more than 160 countries and is trusted by 250+ leading wallets, websites, and applications."',
      hqAddress: '8 The Green, Dover, DE, 19901, USA',
      links: [
        {
          name: 'Homepage',
          url: 'https://www.moonpay.com/',
        },
        {
          name: 'Privacy Policy',
          url: 'https://www.moonpay.com/legal/privacy_policy',
        },
        {
          name: 'Support',
          url: 'https://support.moonpay.com/hc/en-gb/categories/360001595097-Customer-Support-Help-Center',
        },
      ],
      logos: {
        light: '/assets/providers/moonpay_light.png',
        dark: '/assets/providers/moonpay_dark.png',
        height: 24,
        width: 88,
      },
      features: {
        buy: {
          enabled: true,
          userAgent: null,
          padCustomOrderId: false,
          orderCustomId: 'GUID',
          browser: 'APP_BROWSER',
          orderCustomIdRequired: true,
          orderCustomIdExpiration: 60,
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
        recurringBuy: {
          enabled: false,
        },
      },
      type: 'aggregator',
      supportedCryptoCurrencies: {
        'eip155:1/slip44:60': true,
      },
      supportedFiatCurrencies: {
        '/currencies/fiat/eur': true,
        '/currencies/fiat/usd': true,
      },
      supportedPaymentMethods: {
        '/payments/debit-credit-card': true,
        '/payments/apple-pay': true,
      },
    },
  ],
};
