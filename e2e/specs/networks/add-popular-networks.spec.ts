import {
  SmokeNetworkAbstractions,
  RegressionNetworkAbstractions,
} from '../../tags';
import NetworkAddedBottomSheet from '../../pages/Network/NetworkAddedBottomSheet';
import NetworkApprovalBottomSheet from '../../pages/Network/NetworkApprovalBottomSheet';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import Assertions from '../../framework/Assertions';

// Shared configuration
const isRemoveGlobalNetworkSelectorEnabled =
  process.env.MM_REMOVE_GLOBAL_NETWORK_SELECTOR === 'true';
const itif = (condition: boolean) => (condition ? it : it.skip);

// Tests for when Global Network Selector is enabled (MM_REMOVE_GLOBAL_NETWORK_SELECTOR = true)
describe(SmokeNetworkAbstractions('Add all popular networks'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  itif(isRemoveGlobalNetworkSelectorEnabled)(
    'Add all popular networks to verify the empty list content',
    async () => {
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
    },
  );
});

// Tests for when Global Network Selector is disabled (MM_REMOVE_GLOBAL_NETWORK_SELECTOR = false)
describe(
  RegressionNetworkAbstractions('Add all popular networks - GNS Disabled'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(170000);
    });

    itif(!isRemoveGlobalNetworkSelectorEnabled)(
      'Add all popular networks to verify the empty list content',
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
  },
);
