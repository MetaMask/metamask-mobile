/**
 * Ramp SDK API mock for component view tests.
 * Intercepts:
 * - GET https://on-ramp-cache.uat-api.cx.metamask.io/regions/countries
 * - GET https://on-ramp.uat-api.cx.metamask.io/geolocation
 * - GET https://on-ramp-cache.uat-api.cx.metamask.io/<regionId>/light (any query params)
 *
 * These are the three HTTP calls made by the Aggregator SDK during provider
 * initialisation and per-region data loading. All must be mocked when
 * disableNetConnect() is active or the SDK will throw and BuildQuote shows
 * an error view instead of the main UI.
 *
 * Use in beforeEach/afterEach of Aggregator component view tests.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { clearAllNockMocks, disableNetConnect } from './nockHelpers';

const RAMP_REGIONS_ORIGIN = 'https://on-ramp-cache.uat-api.cx.metamask.io';
const RAMP_ORDERS_ORIGIN = 'https://on-ramp.uat-api.cx.metamask.io';

export const mockRampCountriesData = [
  {
    id: '/regions/us',
    name: 'United States',
    emoji: '🇺🇸',
    detected: false,
    currencies: ['/currencies/fiat/usd'],
    support: { buy: true, sell: true },
    states: [],
  },
  {
    id: '/regions/es',
    name: 'Spain',
    emoji: '🇪🇸',
    detected: false,
    currencies: ['/currencies/fiat/eur'],
    support: { buy: true, sell: true },
    states: [],
  },
  {
    id: '/regions/fr',
    name: 'France',
    emoji: '🇫🇷',
    detected: false,
    currencies: ['/currencies/fiat/eur'],
    support: { buy: true, sell: true },
    states: [],
  },
];

export const mockRampCountryCacheData = {
  payments: [
    {
      id: '/payments/apple-pay',
      paymentType: 'apple-pay',
      name: 'Apple Pay',
      score: 285,
      icons: [{ type: 'fontAwesome', name: 'apple' }],
      logo: { light: [], dark: [] },
      disclaimer: 'Apple Cash is not supported.',
      delay: [0, 0],
      amountTier: [1, 3],
      isApplePay: true,
      sellEnabled: false,
    },
    {
      id: '/payments/debit-credit-card',
      paymentType: 'debit-credit-card',
      name: 'Debit or Credit',
      score: 268,
      icons: [{ type: 'materialIcons', name: 'card' }],
      logo: { light: [], dark: [] },
      disclaimer:
        "Credit card purchases may incur your bank's cash advance fees.",
      delay: [5, 10],
      amountTier: [1, 3],
      sellEnabled: true,
    },
    {
      id: '/payments/sepa-bank-transfer',
      paymentType: 'bank-transfer',
      name: 'SEPA Bank Transfer',
      score: 250,
      icons: [{ type: 'materialCommunityIcons', name: 'bank' }],
      logo: { light: [], dark: [] },
      delay: [1440, 2880],
      amountTier: [2, 3],
      sellEnabled: true,
      supportedCurrency: ['/currencies/fiat/eur'],
      supportedRegions: ['/regions/fr', '/regions/es'],
    },
  ],
  cryptoCurrencies: [
    {
      id: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      idv2: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      legacyId: '/currencies/crypto/1/eth',
      symbol: 'ETH',
      name: 'Ethereum',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      network: {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x0000000000000000000000000000000000000000.png',
      excludedFiatAndPaymentMethods: [],
    },
    {
      id: '/currencies/crypto/1/0x6b175474e89094c44da98b954eedeac495271d0f',
      idv2: '/currencies/crypto/1/0x6b175474e89094c44da98b954eedeac495271d0f',
      legacyId: '/currencies/crypto/1/dai',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      decimals: 18,
      network: {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x6b175474e89094c44da98b954eedeac495271d0f.png',
      excludedFiatAndPaymentMethods: [],
    },
    {
      id: '/currencies/crypto/1/0xaca92e438df0b2401ff60da7e4337b687a2435da',
      idv2: '/currencies/crypto/1/0xaca92e438df0b2401ff60da7e4337b687a2435da',
      symbol: 'mUSD',
      name: 'mUSD',
      address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
      decimals: 18,
      network: {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
      excludedFiatAndPaymentMethods: [],
    },
  ],
  fiatCurrencies: [
    {
      id: '/currencies/fiat/usd',
      symbol: 'USD',
      name: 'US Dollar',
      denomSymbol: '$',
      decimals: 2,
      excludedPaymentMethods: [],
    },
    {
      id: '/currencies/fiat/eur',
      symbol: 'EUR',
      name: 'Euro',
      denomSymbol: '€',
      decimals: 2,
      excludedPaymentMethods: [],
    },
  ],
  parameters: {},
  limits: {
    minAmount: 10,
    maxAmount: 10000,
    quickAmounts: [50, 100, 200],
    feeDynamicRate: 0,
    feeFixedRate: 0,
  },
};

/**
 * Sets up nock interceptors for all Ramp SDK API calls.
 * Call in beforeEach.
 */
export function setupRampSdkApiMock(): void {
  clearAllNockMocks();
  disableNetConnect();

  nock(RAMP_REGIONS_ORIGIN)
    .get('/regions/countries')
    .query(true)
    .reply(200, mockRampCountriesData)
    .persist();

  nock(RAMP_ORDERS_ORIGIN)
    .get('/geolocation')
    .query(true)
    .reply(200, 'us')
    .persist();

  nock(RAMP_REGIONS_ORIGIN)
    .get(/^\/regions\/.*\/light/)
    .query(true)
    .reply(200, mockRampCountryCacheData)
    .persist();
}

/**
 * Clears nock interceptors and Jest mocks for Ramp SDK tests.
 * Call in afterEach.
 */
export function clearRampSdkApiMocks(): void {
  jest.clearAllMocks();
  clearAllNockMocks();
}
