'use strict';
import TestHelpers from '../../helpers';
import { SmokeMultiChainPermissions } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import PermissionSummaryBottomSheet from '../../pages/Browser/PermissionSummaryBottomSheet';
import { PermissionSummaryBottomSheetSelectorsText } from '../../selectors/Browser/PermissionSummaryBottomSheet.selectors';

describe(
  SmokeMultiChainPermissions('Permission System - Default Permissions'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.reverseServerPort();
    });

    it('should display default account and chain permissions in permission summary', async () => {
      // Test setup with fixtures
      await withFixtures(
        {
          dapp: true,
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission() // Initialize with Ethereum mainnet only
            .build(),
          restartDevice: true,
        },
        async () => {
          // Step 1: Initial app setup
          await loginToApp();
          await TabBarComponent.tapBrowser();
          await Browser.navigateToTestDApp();
          // Step 2: Navigate to permissions management
          await Browser.tapNetworkAvatarButtonOnBrowser();
          await ConnectedAccountsModal.tapManagePermissionsButton();

          // Step 3: Verify account permissions
          const accountLabelElement =
            await PermissionSummaryBottomSheet.accountPermissionLabelContainer;
          const accountLabelAttributes =
            await accountLabelElement.getAttributes();
          const accountLabel = accountLabelAttributes.label;

          await Assertions.checkIfTextMatches(
            accountLabel,
            PermissionSummaryBottomSheetSelectorsText.ACCOUNT_ONE_LABEL,
          );

          // Step 4: Verify chain permissions
          await Assertions.checkIfVisible(
            PermissionSummaryBottomSheet.ethereumMainnetText,
          );
        },
      );
    });
  },
);
