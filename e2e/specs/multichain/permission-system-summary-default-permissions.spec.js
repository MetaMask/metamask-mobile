'use strict';
import TestHelpers from '../../helpers';
import { SmokeMultiChain } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import PermissionSummaryBottomSheet from '../../pages/Browser/PermissionSummaryBottomSheet';

describe(SmokeMultiChain('MultiChain Permissions System:'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  fit('should display default chain and account in permission summary', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .withChainPermission() // Initialize with only Ethereum mainnet
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        // Open permissions modal
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await ConnectedAccountsModal.tapManagePermissionsButton();

        // Verify default permissions
        await Assertions.checkIfVisible(
          PermissionSummaryBottomSheet.ethereumMainnetText,
        );
        await Assertions.checkIfVisible(
          PermissionSummaryBottomSheet.accountPermissionText,
        );
      },
    );
  });
});
