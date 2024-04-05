/* eslint-disable import/prefer-default-export */

import { QuoteError, QuoteResponse } from '@consensys/on-ramp-sdk';
import { DeepPartial } from './Quotes.types';

export const mockQuotesData = [
  {
    provider: {
      id: '/providers/banxa-staging',
      name: 'Banxa (Staging)',
      description:
        "Per Banxa: “Established from 2014, Banxa is the world's first publicly listed Financial technology platform, powering a world-leading fiat to crypto gateway solution for customers to buy, sell and trade digital assets. Banxa's payment infrastructure offers online payment services across multiple currencies, crypto, and payment types from card to local bank transfers. Banxa now supports over 130+ countries and more than 80 currencies.”",
      hqAddress: '2/6 Gwynne St, Cremorne VIC 3121, Australia',
      links: [
        {
          name: 'Homepage',
          url: 'https://banxa.com/',
        },
        {
          name: 'Terms of service',
          url: 'https://banxa.com/wp-content/uploads/2022/10/Customer-Terms-and-Conditions-1-July-2022.pdf',
        },
      ],
      logos: {
        light:
          'https://on-ramp.dev-api.cx.metamask.io/assets/providers/banxa_light.png',
        dark: 'https://on-ramp.dev-api.cx.metamask.io/assets/providers/banxa_dark.png',
        height: 24,
        width: 65,
      },
      features: {
        buy: {
          userAgent: null,
          padCustomOrderId: false,
          orderCustomId: '',
          browser: 'APP_BROWSER',
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
      },
    },
    crypto: {
      id: '/currencies/crypto/1/eth',
      idv2: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      network: {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://token.metaswap.codefi.network/assets/nativeCurrencyLogos/ethereum.svg',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
    },
    cryptoId: '/currencies/crypto/1/eth',
    fiat: {
      id: '/currencies/fiat/aud',
      symbol: 'AUD',
      name: 'Australian Dollar',
      decimals: 2,
      denomSymbol: '$',
    },
    fiatId: '/currencies/fiat/aud',
    networkFee: 0,
    providerFee: 1.07,
    extraFee: 0,
    amountIn: 50,
    amountOut: 0.017142,
    paymentMethod: 'debit-credit-card',
    receiver: '0x1',
    isNativeApplePay: false,
    exchangeRate: 2854.3927196359814,
    error: false,
    amountOutInFiat: 46.97353692000001,
  },
  {
    crypto: {
      id: '/currencies/crypto/1/eth',
      idv2: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      network: {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://token.metaswap.codefi.network/assets/nativeCurrencyLogos/ethereum.svg',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
    },
    fiat: {
      id: '/currencies/fiat/aud',
      symbol: 'AUD',
      name: 'Australian Dollar',
      decimals: 2,
      denomSymbol: '$',
    },
    amountIn: 50,
    amountOut: 0.0162,
    networkFee: 2.64,
    providerFee: 1.8399999999999999,
    provider: {
      id: '/providers/moonpay-staging',
      name: 'MoonPay (Staging)',
      environmentType: 'STAGING',
      description:
        'Per MoonPay: “MoonPay provides a smooth experience for converting between fiat currencies and cryptocurrencies. Easily top-up with ETH, BNB and more directly in your MetaMask wallet via MoonPay using all major payment methods including debit and credit card, local bank transfers, Apple Pay, Google Pay, and Samsung Pay. MoonPay is active in more than 160 countries and is trusted by 250+ leading wallets, websites, and applications.”',
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
        light:
          'https://on-ramp.dev-api.cx.metamask.io/assets/providers/moonpay_light.png',
        dark: 'https://on-ramp.dev-api.cx.metamask.io/assets/providers/moonpay_dark.png',
        height: 24,
        width: 88,
      },
      features: {
        buy: {
          enabled: true,
          userAgent: null,
          padCustomOrderId: false,
          orderCustomId: 'GUID',
          orderCustomIdRequired: false,
          orderCustomIdPrefixes: ['c-'],
          browser: 'APP_BROWSER',
          supportedByBackend: true,
          redirection: 'JSON_REDIRECTION',
        },
        quotes: {
          enabled: true,
          supportedByBackend: false,
        },
        sell: {
          enabled: true,
        },
        sellQuotes: {
          enabled: true,
        },
      },
    },
    exchangeRate: 2809.8765432098767,
    error: false,
    amountOutInFiat: 44.392212,
  },
  {
    crypto: {
      id: '/currencies/crypto/1/eth',
      idv2: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      network: {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://token.metaswap.codefi.network/assets/nativeCurrencyLogos/ethereum.svg',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
    },
    fiat: {
      id: '/currencies/fiat/aud',
      symbol: 'AUD',
      name: 'Australian Dollar',
      decimals: 2,
      denomSymbol: '$',
    },
    amountIn: 50,
    amountOut: 0.01590613,
    providerFee: 5.76,
    networkFee: 0.5,
    provider: {
      id: '/providers/transak-staging',
      name: 'Transak (Staging)',
      environmentType: 'STAGING',
      description:
        'Per Transak: “The fastest and securest way to buy 100+ cryptocurrencies on 75+ blockchains. Pay via Apple Pay, UPI, bank transfer or use your debit or credit card. Trusted by 2+ million global users. Transak empowers wallets, gaming, DeFi, NFTs, Exchanges, and DAOs across 125+ countries.”',
      hqAddress:
        '35 Shearing Street, Bury St. Edmunds, IP32 6FE, United Kingdom',
      links: [
        {
          name: 'Homepage',
          url: 'https://www.transak.com/',
        },
        {
          name: 'Privacy Policy',
          url: 'https://www.notion.so/Privacy-Policy-e7f23fb15ece4cf5b0586f9629e08b3f',
        },
        {
          name: 'Support',
          url: 'https://support.transak.com/hc/en-us',
        },
      ],
      logos: {
        light:
          'https://on-ramp.dev-api.cx.metamask.io/assets/providers/transak_light.png',
        dark: 'https://on-ramp.dev-api.cx.metamask.io/assets/providers/transak_dark.png',
        height: 24,
        width: 90,
      },
      features: {
        buy: {
          enabled: true,
          userAgent: null,
          padCustomOrderId: false,
          orderCustomId: '',
          orderCustomIdRequired: false,
          orderCustomIdPrefixes: [],
          browser: 'APP_BROWSER',
          supportedByBackend: false,
          redirection: 'HTTP_REDIRECTION',
        },
        quotes: {
          enabled: true,
          supportedByBackend: false,
        },
      },
    },
    exchangeRate: 2749.8832211229255,
    error: true,
    amountOutInFiat: 43.586931793800005,
  },
] as unknown as (DeepPartial<QuoteResponse> | DeepPartial<QuoteError>)[];
