import SendView from '../../../page-objects/Send/RedesignedSendView';
import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import WalletView from '../../../page-objects/wallet/WalletView';
import { SmokeConfirmations } from '../../../tags';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../flows/wallet.flow';
import Assertions from '../../../framework/Assertions';
import NetworkListModal from '../../../page-objects/Network/NetworkListModal';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';

const TOKEN = 'Bitcoin';

describe(SmokeConfirmations('Send Bitcoin'), () => {
  it('shows insufficient funds', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            homepageRedesignV1: { enabled: false, minimumVersion: '0.0.0' },
            homepageSectionsV1: { enabled: false, minimumVersion: '0.0.0' },
          });
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: /^https:\/\/digest\.api\.cx\.metamask\.io\/api\/v1\/asset-summary/,
            response: {},
            responseCode: 200,
          });
        },
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await Assertions.expectElementToNotBeVisible(
          WalletView.balanceEmptyStateContainer,
          {
            description: 'Balance empty state container should not be visible',
            timeout: 30000,
          },
        );
        await WalletView.tapTokenNetworkFilter();
        await NetworkListModal.changeNetworkTo(TOKEN);
        await WalletView.tapOnToken(TOKEN, 1);
        await TokenOverview.tapSendButton();
        await SendView.enterZeroAmount();
        await SendView.checkInsufficientFundsError();
      },
    );
  });
});
