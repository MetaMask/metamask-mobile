import { SmokeNetworkAbstractions } from '../../tags';
import NetworkAddedBottomSheet from '../../pages/Network/NetworkAddedBottomSheet';
import NetworkApprovalBottomSheet from '../../pages/Network/NetworkApprovalBottomSheet';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import Assertions from '../../framework/Assertions';

// Quarantining for GNS feature
// Original path e2e/specs/networks/add-popular-networks.spec.ts
// Failing on Android, Passes on IOS
describe(SmokeNetworkAbstractions('Add all popular networks'), () => {
  // This test depends on the MM_REMOVE_GLOBAL_NETWORK_SELECTOR environment variable being set to false.
  const isRemoveGlobalNetworkSelectorEnabled =
    process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
  const itif = (condition: boolean) => (condition ? it.skip : it);

  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  itif(isRemoveGlobalNetworkSelectorEnabled)(
    `Add all popular networks to verify the empty list content`,
    async () => {
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
    },
  );
});
