'use strict';
import { SmokePermissions } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import BrowserView from '../../pages/Browser/BrowserView';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import PermissionSummaryBottomSheet from '../../pages/Browser/PermissionSummaryBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import Assertions from '../../utils/Assertions';
import { PermissionSummaryBottomSheetSelectorsText } from '../../selectors/Browser/PermissionSummaryBottomSheet.selectors';

describe(SmokePermissions('Wallet Revoke Permissions'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('revokes wallet permissions from a dapp', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        // Step 1: Initial app setup
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await BrowserView.navigateToTestDApp();

        // Step 2: Navigate to permissions management
        await BrowserView.tapNetworkAvatarButtonOnBrowser();
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

        // Step 4: Revoke permissions
        await TestDApp.tapRevokeAccountPermissionsButton();
        await TestHelpers.delay(5000);

        // Step 5: Verify permissions revoked
        await TabBarComponent.tapBrowser();
        await BrowserView.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
      },
    );
  });
});
