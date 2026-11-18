import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeNetworkAbstractions } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../../flows/browser.flow.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { DappVariants } from '../../../framework/Constants.js';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal.js';
import AccountListBottomSheet from '../../../page-objects/wallet/AccountListBottomSheet.js';

/**
 * Account-connect half of the old "manages permissions for multiple accounts
 * and networks" case. Own file so the iOS device pool can run it beside the
 * chain-edit spec instead of serializing a ~300s body on one worker.
 * Timeout stays 360s.
 */
appiumTest.describe(
  SmokeNetworkAbstractions('Chain Permission Management'),
  () => {
    appiumTest.describe.configure({ timeout: 360_000 });

    appiumTest(
      'connects multiple accounts to the dapp',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
            fixture: new FixtureBuilder()
              .withPermissionControllerConnectedToTestDapp()
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await navigateToBrowserView();

            await Browser.navigateToTestDApp();
            await waitForTestDappToLoad();
            await ConnectedAccountsModal.openFromBrowser();
            await ConnectedAccountsModal.expectConnectedAccountDisplayed(
              'Account 1',
            );

            await ConnectedAccountsModal.tapAccountListBottomSheet();
            await AccountListBottomSheet.addAccountAndExpectVisibleV2(
              'Account 2',
            );

            await AccountListBottomSheet.tapAccountByNameV2('Account 2');
            await AccountListBottomSheet.tapConnectAccountsButton();

            await ConnectedAccountsModal.expectConnectedAccountsDisplayed([
              'Account 1',
              'Account 2',
            ]);

            await ConnectedAccountsModal.tapAccountListBottomSheet();
            await AccountListBottomSheet.addAccountAndExpectVisibleV2(
              'Account 3',
            );

            await AccountListBottomSheet.tapAccountByNameV2('Account 3');
            await AccountListBottomSheet.tapConnectAccountsButton();

            await ConnectedAccountsModal.expectConnectedAccountsDisplayed([
              'Account 1',
              'Account 2',
              'Account 3',
            ]);
          },
        );
      },
    );
  },
);
