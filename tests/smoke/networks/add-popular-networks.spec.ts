import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import NetworkListModal from '../../page-objects/Network/NetworkListModal';
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
        await Assertions.expectElementToBeVisible(
          NetworkListModal.getNetworkCell('Arbitrum'),
          { description: 'Arbitrum network visible in list' },
        );
        await NetworkListModal.tapNetworkMenuButton('Arbitrum');

        // Network is added immediately, no approval modal needed.
        // Switch to the Custom tab, wait for Arbitrum to appear, then select it
        // to set it as the active network filter (enabling ≠ selecting in multichain mode).
        await NetworkListModal.tapOnCustomTab();
        await Assertions.expectElementToBeVisible(
          NetworkListModal.getNetworkCell('Arbitrum'),
          {
            description:
              'Arbitrum network visible in custom tab after enabling',
          },
        );
        await NetworkListModal.selectNetworkInCustomTab('Arbitrum');
        await WalletView.verifyTokenNetworkFilterText('Arbitrum');
      },
    );
  });
});
