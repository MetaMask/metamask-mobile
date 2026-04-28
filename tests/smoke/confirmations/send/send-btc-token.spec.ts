import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import WalletView from '../../../page-objects/wallet/WalletView';
import { SmokeConfirmations } from '../../../tags';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../flows/wallet.flow';
import Assertions from '../../../framework/Assertions';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';

const TOKEN = 'Bitcoin';

describe(SmokeConfirmations('Send Bitcoin'), () => {
  it('hides send button for zero balance token', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            {
              homepageRedesignV1: { enabled: false, minimumVersion: '0.0.0' },
              homepageSectionsV1: { enabled: false, minimumVersion: '0.0.0' },
            },
            1000,
          );
        },
      },
      async () => {
        await loginToApp();
        // Making the assertion before disabling synchronization so that flags
        // are properly fetched and this mocked flag is set
        await Assertions.expectElementToNotBeVisible(
          WalletView.balanceEmptyStateContainer,
          {
            description: 'Balance empty state container should not be visible',
            timeout: 30000,
          },
        );
        await device.disableSynchronization();
        await WalletView.tapOnToken(TOKEN, 0);
        // Token details V2 layout hides Send and shows Receive for zero-balance tokens
        await Assertions.expectElementToBeVisible(TokenOverview.receiveButton, {
          description:
            'Receive button should be visible for zero-balance token',
          timeout: 15000,
        });
      },
    );
  });
});
