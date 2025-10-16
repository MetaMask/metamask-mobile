import { MockEventsObject } from '../../../framework';

/**
 * Minimal mock data for MetaMask dapp scanning API endpoints used in E2E testing.
 * Returns basic feature flags structure to prevent API failures.
 * For specific swap tests, add detailed mocks in the test files.
 */
/**
 * Helper function to create dapp scanning URL endpoints
 */
const createDappScanningUrl = (domain: string): string =>
  `https://dapp-scanning.api.cx.metamask.io/v2/scan?url=${domain}`;

export const DAPP_SCANNING_MOCKS: MockEventsObject = {
  GET: [
    {
      urlEndpoint: createDappScanningUrl('www.google.com'),
      responseCode: 200,
      response: {
        domainName: 'google.com',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint: createDappScanningUrl('google.com'),
      responseCode: 200,
      response: {
        domainName: 'google.com',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint: createDappScanningUrl('localhost'),
      responseCode: 200,
      response: {
        domainName: 'localhost',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint: createDappScanningUrl('verify.walletconnect.com'),
      responseCode: 200,
      response: {
        domainName: 'verify.walletconnect.com',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint: createDappScanningUrl('portfolio.metamask.io'),
      responseCode: 200,
      response: {
        domainName: 'portfolio.metamask.io',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint: createDappScanningUrl('card.metamask.io'),
      responseCode: 200,
      response: {
        hostname: 'card.metamask.io',
        recommendedAction: 'VERIFIED',
      },
    },
    {
      urlEndpoint: createDappScanningUrl('walletconnect.com'),
      responseCode: 200,
      response: {
        domainName: 'walletconnect.com',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint: createDappScanningUrl('metamask.github.io'),
      responseCode: 200,
      response: {
        domainName: 'metamask.github.io',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint: createDappScanningUrl('www.googletagmanager.com'),
      responseCode: 200,
      response: {
        domainName: 'www.googletagmanager.com',
        recommendedAction: 'NONE',
      },
    },
    {
      urlEndpoint: createDappScanningUrl('widget.solflare.com'),
      responseCode: 200,
      response: {
        domainName: 'widget.solflare.com',
        recommendedAction: 'NONE',
      },
    },
  ],
};
