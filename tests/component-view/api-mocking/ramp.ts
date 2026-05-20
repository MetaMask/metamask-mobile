// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { SDK } from '../../../app/components/UI/Ramp/Aggregator/sdk';
import { clearAllNockMocks, disableNetConnect } from './nockHelpers';

/** Staging (UAT) and production hosts — mock both so tests stay offline regardless of getSdkEnvironment(). */
const RAMP_REGIONS_ORIGINS = [
  'https://on-ramp-cache.uat-api.cx.metamask.io',
  'https://on-ramp-cache.api.cx.metamask.io',
] as const;
const RAMP_ORDERS_ORIGINS = [
  'https://on-ramp.uat-api.cx.metamask.io',
  'https://on-ramp.api.cx.metamask.io',
] as const;

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
    {
      id: '/currencies/crypto/8453/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      idv2: '/currencies/crypto/8453/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      legacyId: '/currencies/crypto/8453/usdc',
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      decimals: 6,
      network: {
        active: true,
        chainId: '8453',
        chainName: 'Base Mainnet',
        shortName: 'Base',
      },
      logo: 'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
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

interface RampSdkTestInstance {
  regionsService?: unknown;
  regionsAxios?: unknown;
  ordersAxios?: unknown;
  ordersService?: unknown;
}

/**
 * Clears cached RegionsService / axios instances on the Aggregator SDK singleton.
 * Required after nock.cleanAll() so the next test recreates clients with fresh interceptors.
 */
export function resetRampAggregatorSdkForTests(): void {
  const instance = SDK as RampSdkTestInstance;
  instance.regionsService = undefined;
  instance.regionsAxios = undefined;
  instance.ordersAxios = undefined;
  instance.ordersService = undefined;
}

function registerRampSdkNockInterceptors(): void {
  for (const origin of RAMP_REGIONS_ORIGINS) {
    nock(origin)
      .get('/regions/countries')
      .query(true)
      .reply(200, mockRampCountriesData)
      .persist();

    nock(origin)
      .get(/^\/regions\/.*\/light/)
      .query(true)
      .reply(200, mockRampCountryCacheData)
      .persist();
  }

  for (const origin of RAMP_ORDERS_ORIGINS) {
    nock(origin).get('/geolocation').query(true).reply(200, 'us').persist();
  }
}

/**
 * Sets up nock interceptors for all Ramp SDK API calls.
 * Call in beforeEach.
 */
export function setupRampSdkApiMock(): void {
  clearAllNockMocks();
  resetRampAggregatorSdkForTests();
  disableNetConnect();
  registerRampSdkNockInterceptors();
}

/**
 * Clears nock interceptors and Jest mocks for Ramp SDK tests.
 * Call in afterEach.
 */
export function clearRampSdkApiMocks(): void {
  jest.clearAllMocks();
  resetRampAggregatorSdkForTests();
  clearAllNockMocks();
}
