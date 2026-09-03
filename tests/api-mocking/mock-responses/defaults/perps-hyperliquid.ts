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
    {
      // Generic E2E fixtures use the deterministic provider mocks below.
      urlEndpoint:
        /^https:\/\/terminal\.(dev-api|uat-api|api)\.cx\.metamask\.io\/v2\/perpetuals/,
      responseCode: 503,
      response: {},
    },
  ],
  POST: [
    {
      // Must include statuses — HyperLiquidProvider reads resting/filled oid.
      // Bare `{ status: 'ok' }` surfaces as Order failed in the UI.
      urlEndpoint: hyperliquidExchangeEndpoint,
      responseCode: 200,
      response: {
        status: 'ok',
        response: {
          type: 'order',
          data: {
            statuses: [{ resting: { oid: 100001 } }],
          },
        },
      },
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
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      requestBody: {
        type: 'userAbstraction',
      },
      ignoreFields: ['user'],
      responseCode: 200,
      response: JSON.stringify('unifiedAccount'),
      priority: hyperliquidMockPriority,
    },
    // Catch-all for info POSTs whose `type` is not listed above. Without this,
    // findMatchingPostEvent finds no body match and no no-body fallback, so the
    // request is recorded as live and fixture cleanup fails even when the test
    // assertions already passed (permission / getSession Appium smokes).
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      responseCode: 200,
      response: {},
      priority: hyperliquidMockPriority,
    },
  ],
};
