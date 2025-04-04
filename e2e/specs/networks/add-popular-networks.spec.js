'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import NetworkAddedBottomSheet from '../../pages/Network/NetworkAddedBottomSheet';
import NetworkApprovalBottomSheet from '../../pages/Network/NetworkApprovalBottomSheet';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import Assertions from '../../utils/Assertions';

describe(Regression('Add all popular networks'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
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

        await Assertions.checkIfVisible(
          NetworkListModal.addPopularNetworkButton,
        );
        await NetworkListModal.tapAddNetworkButton();
        await NetworkApprovalBottomSheet.tapApproveButton();
        await NetworkAddedBottomSheet.tapCloseButton();
      },
    );
  });
});
