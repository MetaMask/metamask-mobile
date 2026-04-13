import { MockEventsObject } from '../../../framework';

const hyperliquidInfoEndpoint = 'https://api.hyperliquid.xyz/info';

export const PERPS_HYPERLIQUID_MOCKS: MockEventsObject = {
  POST: [
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      requestBody: { type: 'allMids' },
      responseCode: 200,
      response: {},
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
    },
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      requestBody: { type: 'perpDexs' },
      responseCode: 200,
      response: {},
    },
    {
      urlEndpoint: hyperliquidInfoEndpoint,
      requestBody: {
        type: 'frontendOpenOrders',
      },
      ignoreFields: ['user'],
      responseCode: 200,
      response: {},
    },
  ],
};
