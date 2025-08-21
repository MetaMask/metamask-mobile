import { MockEventsObject } from '../../../framework';

/**
 * Minimal mock data for MetaMask dapp scanning API endpoints used in E2E testing.
 * Returns basic feature flags structure to prevent API failures.
 * For specific swap tests, add detailed mocks in the test files.
 */
export const DAPP_SCANNING_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/v2/scan?url=www.google.com',
      responseCode: 200,
      response: {
        domainName: 'google.com',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/v2/scan?url=google.com',
      responseCode: 200,
      response: {
        domainName: 'google.com',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/v2/scan?url=localhost',
      responseCode: 200,
      response: {
        domainName: 'localhost',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/v2/scan?url=verify.walletconnect.com',
      responseCode: 200,
      response: {
        domainName: 'verify.walletconnect.com',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint:
        'https://dapp-scanning.api.cx.metamask.io/v2/scan?url=portfolio.metamask.io',
      responseCode: 200,
      response: {
        domainName: 'portfolio.metamask.io',
        recommendedAction: 'NONE',
      },
    },
  ],
};
