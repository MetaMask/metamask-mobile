import { MockEventsObject } from '../../../framework';

export const PERPS_HYPERLIQUID_MOCKS: MockEventsObject = {
  POST: [
    {
      urlEndpoint: 'https://api.hyperliquid.xyz/info',
      requestBody: { type: 'meta' },
      responseCode: 200,
      response: {},
    },
  ],
};
