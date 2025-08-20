import { TestSpecificMock } from '../../../framework';

/**
 * Minimal mock data for WalletConnect API endpoints used in E2E testing.
 * Returns basic responses to prevent API failures.
 * For specific WalletConnect tests, add detailed mocks in the test files.
 */
export const WALLETCONNECT_MOCKS: TestSpecificMock = {
  POST: [
    {
      urlEndpoint: /^https:\/\/pulse\.walletconnect\.org\/batch\?.*$/,
      responseCode: 200,
      response: '',
    },
  ],
};
