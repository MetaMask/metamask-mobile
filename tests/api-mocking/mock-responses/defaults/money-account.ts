import { MockEventsObject } from '../../../framework';

export const MONEY_ACCOUNT_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint: /^https:\/\/api\.sevenseas\.capital\/performance\/.+\/.+$/,
      responseCode: 200,
      response: {
        apy: 0,
        timestamp: new Date().toISOString(),
      },
    },
  ],
};
