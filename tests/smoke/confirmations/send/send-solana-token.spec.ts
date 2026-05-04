/* eslint-disable jest/no-disabled-tests -- E2E skipped; covered by component view tests */
import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import WalletView from '../../../page-objects/wallet/WalletView';
import { SmokeConfirmations } from '../../../tags';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { Assertions } from '../../../framework';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';

describe(SmokeConfirmations('Send SOL token'), () => {
  // Moved to cv tests (send.non-evm.view.test.tsx)
  it.skip('should send solana to an address', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: 'https://digest.api.cx.metamask.io/api/v1/asset-summary?asset=solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            response: {
              id: 'mock-id',
              assetId: 'Solana',
              assetSymbol: 'SOL',
              digest: {
                version: '1.0',
                asset: 'SOL',
                generatedAt: '2026-04-08T07:01:42.371Z',
                headline: 'SOL trades near $85 amid ecosystem developments',
                summary:
                  'Solana SOL token is trading near $85 with a $48 billion market cap.',
                trends: [],
                social: [],
                sources: [],
              },
              generatedAt: '2026-04-08T07:01:42.392Z',
              processingTime: 1000,
              success: true,
              error: null,
              createdAt: '2026-04-08T07:01:42.401Z',
              updatedAt: '2026-04-08T07:01:42.401Z',
            },
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await WalletView.tapOnToken('Solana');
        await TokenOverview.tapSendButton();

        // Since we're not yet mockign Solana and there's residual balance that
        // can be flaky when loading we're only checking that we're on the
        // correct screen and sending the correct token.
        await Assertions.expectTextDisplayed('Send');
        await Assertions.expectTextDisplayed('SOL');
      },
    );
  });
});
