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
      response: {},
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
      // `user` is the wallet address; `dex` is included when querying a specific perp DEX.
      ignoreFields: ['user', 'dex'],
      responseCode: 200,
      response: {},
    },
  ],
};
