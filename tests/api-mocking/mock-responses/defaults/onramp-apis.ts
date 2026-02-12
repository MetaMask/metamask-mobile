import { MockEventsObject } from '../../../framework';
import {
  RampsRegions,
  RampsRegionsEnum,
} from '../../../framework/Constants.ts';
import { RAMPS_NETWORKS_RESPONSE } from '../ramps/ramps-mocks.ts';
import { createGeolocationResponse } from '../ramps/ramps-geolocation.ts';

/**
 * Mock data for on-ramp API endpoints used in E2E testing.
 * Covers geolocation and network information.
 * Can be overriden by testSpecificMock
 */

export const DEFAULT_RAMPS_API_MOCKS: MockEventsObject = {
  GET: [
    ...createGeolocationResponse(RampsRegions[RampsRegionsEnum.UNITED_STATES]),
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.dev-api\.cx\.metamask\.io\/regions\/networks/,
      responseCode: 200,
      response: RAMPS_NETWORKS_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/regions\/networks\?.*$/,
      responseCode: 200,
      response: RAMPS_NETWORKS_RESPONSE,
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp\.uat-api\.cx\.metamask\.io\/providers\/banxa-staging\/buy-widget\?.*$/,
      responseCode: 200,
      response: {
        url: 'https://metamask.banxa-sandbox.com/papi/transit/?initId=eyJpdiI6ImtlOGdjdE1BZHA2Y1UrbW9KMVNGUUE9PSIsInZhbHVlIjoiUG5BOVozdk4vN24zZ3k0dVMwZUVjay9oU1FOQmkvdGFUN2hQb0tMWUdVRit3MnowK001VS9SVERzY09Zano0RnhBMk1FS292ckI4YlRGZGNsSzl2Sk5ycnRpRnVSUUJBOWZyZjVHcjN6cG9lV0N3SnhCY2RBTUZnNWRZa3AvNUd1d0NHaFRxd0RDN1lYUlhMVXBnenh0QkFZcEppaHEzakFuTHlGTTJyazVUT3lIVUNSMno4TjhKVUQxWkFjZlZ0SnJzcjZQZ1d2YXdPK1B6WkU0NUxvcGZWaXhzeWpXbXlCdUZsN1UzbC9nemN1N0pVTEE3U3Q4MkJSeEVHS1p2cmtPblU0Zkl4QWIzamVBWVJCOFY2bHcxZnhnb0VoL2RIOGxVTDYrUThtUEdXbGxCc00yY1U4SWx4MmNlc3NtV0NoSXlpL0xKUVZmTEVtMWt5WWZlZUIxNHFRTGJGdGkrRU5XeWh0UHl4VXRNaFcwQUM5U3NRdm0wZDR4aHFJM2Z0amJYR3Mya0xNVUdiOE10RmJ3c0lhcHEvc3Z0ZVkwdm0wUUlkdDRXMDQ0NERQZnpGd2NRTUFWQ285YmRmUFhSWWlvY01aWlJJaEJCZEM3ZjE4cHpSa25WQzdiVjh4OWIxVHUycHM2SFNFV3Z6cndyalNjc0szcnN4VldqVnFVdkJDYjFBL3RyMTJ3enNUSWUzZUlUUGVXNS9GL0Mzb1FGWk5OZFZaYmtDdDM4PSIsIm1hYyI6ImExM2YzODc1YjEzNDkzOTJjZTAxZDA0MzA4YWEzYWY5NjVlZWFhYTlkYzFlMmRlYjllMjkwM2FlNGUyMjM4MjAiLCJ0YWciOiIifQ==',
        browser: 'APP_BROWSER',
        orderId: null,
      },
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-content\.uat-api\.cx\.metamask\.io\/regions\/countries(\/.*)?$/,
      responseCode: 200,
      response: {
        global: true,
        deposit: true,
        aggregator: true,
      },
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/v2\/regions\/countries\?.*$/,
      responseCode: 200,
      response: [],
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/v2\/regions\/[^/]+\/topTokens\?.*$/,
      responseCode: 200,
      response: {
        topTokens: [
          {
            assetId:
              'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            chainId: 'eip155:1',
            decimals: 6,
            name: 'MetaMask USD',
            symbol: 'MUSD',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
            tokenSupported: true,
          },
          {
            assetId:
              'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            chainId: 'eip155:59144',
            decimals: 6,
            name: 'MetaMask USD',
            symbol: 'MUSD',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
            tokenSupported: true,
          },
          {
            assetId: 'eip155:1/slip44:60',
            chainId: 'eip155:1',
            decimals: 18,
            name: 'Ethereum',
            symbol: 'ETH',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
            tokenSupported: true,
          },
          {
            assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
            chainId: 'bip122:000000000019d6689c085ae165831e93',
            decimals: 8,
            name: 'Bitcoin',
            symbol: 'BTC',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
            tokenSupported: true,
          },
          {
            assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            decimals: 9,
            name: 'Solana',
            symbol: 'SOL',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
            tokenSupported: true,
          },
          {
            assetId: 'eip155:56/slip44:714',
            chainId: 'eip155:56',
            decimals: 18,
            name: 'Binance Coin',
            symbol: 'BNB',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/slip44/714.png',
            tokenSupported: true,
          },
        ],
        allTokens: [
          {
            assetId:
              'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            chainId: 'eip155:1',
            decimals: 6,
            name: 'MetaMask USD',
            symbol: 'MUSD',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
            tokenSupported: true,
          },
          {
            assetId:
              'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            chainId: 'eip155:59144',
            decimals: 6,
            name: 'MetaMask USD',
            symbol: 'MUSD',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
            tokenSupported: true,
          },
          {
            assetId: 'eip155:1/slip44:60',
            chainId: 'eip155:1',
            decimals: 18,
            name: 'Ethereum',
            symbol: 'ETH',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
            tokenSupported: true,
          },
          {
            assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
            chainId: 'bip122:000000000019d6689c085ae165831e93',
            decimals: 8,
            name: 'Bitcoin',
            symbol: 'BTC',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
            tokenSupported: true,
          },
          {
            assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            decimals: 9,
            name: 'Solana',
            symbol: 'SOL',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
            tokenSupported: true,
          },
          {
            assetId: 'eip155:56/slip44:714',
            chainId: 'eip155:56',
            decimals: 18,
            name: 'Binance Coin',
            symbol: 'BNB',
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/slip44/714.png',
            tokenSupported: true,
          },
        ],
      },
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/v2\/regions\/[^/]+\/providers\?.*$/,
      responseCode: 200,
      response: {
        providers: [
          {
            id: '/providers/mercuryo-staging',
            name: 'Mercuryo (Staging)',
            environmentType: 'STAGING',
            description:
              'Per Mercuryo: "Mercuryo offers easy onboarding for MetaMask users, with a speedy purchase process of under 15 seconds Light KYC up to 700$. With support for 20+ tokens, customers can pay using preferred methods, such as Apple Pay and bank cards."',
            hqAddress: 'London, United Kingdom, 77 Gracechurch, EC3V0AG',
            links: [
              {
                name: 'Homepage',
                url: 'https://mercuryo.io/',
              },
              {
                name: 'Privacy Policy',
                url: 'https://mercuryo.io/legal/privacy/',
              },
              {
                name: 'Support',
                url: 'https://help.mercuryo.io/en/',
              },
            ],
            logos: {
              light: '/assets/providers/mercuryo_light.png',
              dark: '/assets/providers/mercuryo_dark.png',
              height: 24,
              width: 88,
            },
            features: {
              buy: {
                enabled: true,
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
              sell: {
                enabled: true,
              },
              sellQuotes: {
                enabled: true,
              },
              recurringBuy: {
                enabled: true,
              },
            },
            type: 'aggregator',
            supportedCryptoCurrencies: {
              'eip155:1/slip44:60': true,
              'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': true,
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': true,
              'bip122:000000000019d6689c085ae165831e93/slip44:0': true,
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
            id: '/providers/banxa-staging',
            name: 'Banxa (Staging)',
            environmentType: 'STAGING',
            description:
              'Per Banxa: "Established from 2014, Banxa is the world\'s first publicly listed Financial technology platform, powering a world-leading fiat to crypto gateway solution for customers to buy, sell and trade digital assets. Banxa\'s payment infrastructure offers online payment services across multiple currencies, crypto, and payment types from card to local bank transfers. Banxa now supports over 130+ countries and more than 80 currencies."',
            hqAddress: '2/6 Gwynne St, Cremorne VIC 3121, Australia',
            links: [
              {
                name: 'Homepage',
                url: 'https://banxa.com/',
              },
              {
                name: 'Terms of Service',
                url: 'https://banxa.com/wp-content/uploads/2022/10/Customer-Terms-and-Conditions-1-July-2022.pdf',
              },
              {
                name: 'Support',
                url: 'https://support.banxa.com/en/support/tickets/new',
              },
            ],
            logos: {
              light: '/assets/providers/banxa_light.png',
              dark: '/assets/providers/banxa_dark.png',
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
              sell: {
                enabled: true,
              },
              sellQuotes: {
                enabled: true,
              },
              recurringBuy: {},
            },
            type: 'aggregator',
            supportedCryptoCurrencies: {
              'eip155:1/slip44:60': true,
              'eip155:59144/slip44:60': true,
              'bip122:000000000019d6689c085ae165831e93/slip44:0': true,
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
      },
    },
    {
      urlEndpoint:
        /^https:\/\/on-ramp-cache\.uat-api\.cx\.metamask\.io\/v2\/regions\/[^/]+\/payments\?.*$/,
      responseCode: 200,
      response: {
        payments: [
          {
            id: '/payments/debit-credit-card',
            paymentType: 'debit-credit-card',
            name: 'Debit or Credit',
            score: 90,
            icons: [
              {
                type: 'materialIcons',
                name: 'card',
              },
            ],
            logo: {
              light: [
                'assets/Visa-regular@3x.png',
                'assets/Mastercard-regular@3x.png',
              ],
              dark: ['assets/Visa@3x.png', 'assets/Mastercard@3x.png'],
            },
            disclaimer:
              "Credit card purchases may incur your bank's cash advance fees, subject to your bank's policies.",
            delay: [5, 10],
            pendingOrderDescription:
              'Card purchases may take a few minutes to complete.',
            amountTier: [1, 3],
            sellEnabled: true,
            sell: {
              enabled: true,
            },
            recurringBuy: {
              enabled: true,
            },
            buy: {
              enabled: true,
            },
          },
          {
            id: '/payments/apple-pay',
            paymentType: 'apple-pay',
            name: 'Apple Pay',
            score: 100,
            icons: [
              {
                type: 'fontAwesome',
                name: 'apple',
              },
            ],
            logo: {
              light: [
                'assets/Visa-regular@3x.png',
                'assets/Mastercard-regular@3x.png',
              ],
              dark: ['assets/Visa@3x.png', 'assets/Mastercard@3x.png'],
            },
            disclaimer: 'Apple Cash is not supported.',
            delay: [0, 0],
            pendingOrderDescription:
              'Card purchases may take a few minutes to complete.',
            amountTier: [1, 3],
            isApplePay: true,
            sell: {
              enabled: false,
            },
            recurringBuy: {
              enabled: true,
            },
            buy: {
              enabled: true,
            },
          },
        ],
        sorted: [
          {
            sortBy: '1',
            ids: ['/payments/debit-credit-card', '/payments/apple-pay'],
          },
        ],
      },
    },
  ],
};
