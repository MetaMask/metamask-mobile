import { SmokeNetworkAbstractions } from '../../tags';
import NetworkApprovalBottomSheet from '../../pages/Network/NetworkApprovalBottomSheet';
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

  it('Add all popular networks to verify the empty list content', async () => {
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

        await NetworkListModal.scrollToBottomOfNetworkMultiSelector();
        await NetworkListModal.tapNetworkMenuButton('Arbitrum');
        await NetworkApprovalBottomSheet.tapApproveButton();
        await NetworkListModal.tapOnCustomTab();
        await NetworkListModal.swipeToDismissNetworkMultiSelectorModal();
        await WalletView.verifyTokenNetworkFilterText('Arbitrum');
      },
    );
  });
});
