import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import Assertions from '../../framework/Assertions';

describe(SmokeNetworkAbstractions('Add all popular networks'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  it('adds a popular network directly without confirmation modal', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
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
