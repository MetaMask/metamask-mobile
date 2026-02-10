import { SmokeNetworkAbstractions } from '../../../e2e/tags';
import { loginToApp } from '../../../e2e/viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import NetworkListModal from '../../../e2e/pages/Network/NetworkListModal';
import Assertions from '../../framework/Assertions';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../api-mocking/mock-responses/feature-flags-mocks';

describe(SmokeNetworkAbstractions('Add all popular networks'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  it('adds a popular network directly without confirmation modal', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetailsV2(false),
          );
        },
      },
      async () => {
        await loginToApp();

        await WalletView.tapTokenNetworkFilter();
        await Assertions.expectElementToBeVisible(
          NetworkListModal.popularNetworksContainer,
        );

        // Tap on a popular network - it should be added directly without confirmation
        await NetworkListModal.scrollToBottomOfNetworkMultiSelector();
        await NetworkListModal.tapNetworkMenuButton('Arbitrum');

        // Network is added immediately, no approval modal needed
        await NetworkListModal.tapOnCustomTab();
        await NetworkListModal.swipeToDismissNetworkMultiSelectorModal();
        await WalletView.verifyTokenNetworkFilterText('Arbitrum');
      },
    );
  });
});
