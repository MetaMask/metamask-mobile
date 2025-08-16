import { SmokeNetworkAbstractions } from '../../tags';
import NetworkAddedBottomSheet from '../../pages/Network/NetworkAddedBottomSheet';
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

  it(`Add all popular networks to verify the empty list content`, async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.scrollToBottomOfNetworkList();

        await Assertions.expectElementToBeVisible(
          NetworkListModal.addPopularNetworkButton,
        );
        await NetworkListModal.tapAddNetworkButton();
        await NetworkApprovalBottomSheet.tapApproveButton();
        await NetworkAddedBottomSheet.tapCloseButton();
      },
    );
  });
});
