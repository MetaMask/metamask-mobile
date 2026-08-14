import { MockEventsObject } from '../../../framework';

const hyperliquidInfoEndpoint = 'https://api.hyperliquid.xyz/info';

const hyperliquidExchangeEndpoint = 'https://api.hyperliquid.xyz/exchange';
const hyperliquidMockPriority = 1001;

export const PERPS_HYPERLIQUID_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        /^https:\/\/terminal\.(dev-api|uat-api|api)\.cx\.metamask\.io\/v1\/perpetuals/,
      responseCode: 200,
      response: [],
    },
  ],
  POST: [
    {
      urlEndpoint: hyperliquidExchangeEndpoint,
      responseCode: 200,
      response: { status: 'ok' },
      priority: hyperliquidMockPriority,
    },
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      requestBody: { type: 'allMids' },
      responseCode: 200,
      response: {},
      priority: hyperliquidMockPriority,
    },
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      requestBody: { type: 'meta' },
      responseCode: 200,
      response: {
        universe: [
          { name: 'BTC', szDecimals: 3, maxLeverage: 50, marginTableId: 0 },
          { name: 'ETH', szDecimals: 4, maxLeverage: 50, marginTableId: 0 },
          { name: 'SOL', szDecimals: 2, maxLeverage: 50, marginTableId: 0 },
        ],
      },
      priority: hyperliquidMockPriority,
    },
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      requestBody: { type: 'perpDexs' },
      responseCode: 200,
      response: {},
      priority: hyperliquidMockPriority,
    },
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      requestBody: {
        type: 'frontendOpenOrders',
      },
      ignoreFields: ['user'],
      responseCode: 200,
      response: {},
      priority: hyperliquidMockPriority,
    },
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      requestBody: {
        type: 'clearinghouseState',
      },
      ignoreFields: ['user', 'dex'],
      responseCode: 200,
      response: {
        marginSummary: {
          accountValue: '0',
          totalNtlPos: '0',
          totalRawUsd: '0',
          totalMarginUsed: '0',
        },
        crossMarginSummary: {
          accountValue: '0',
          totalNtlPos: '0',
          totalRawUsd: '0',
          totalMarginUsed: '0',
        },
        crossMaintenanceMarginUsed: '0',
        withdrawable: '0',
        assetPositions: [],
        time: 0,
      },
      priority: hyperliquidMockPriority,
    },
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      requestBody: {
        type: 'spotClearinghouseState',
      },
      ignoreFields: ['user'],
      responseCode: 200,
      response: {
        balances: [],
      },
      priority: hyperliquidMockPriority,
    },
  ],
};
