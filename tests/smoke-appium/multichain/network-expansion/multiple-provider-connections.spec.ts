import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeNetworkExpansion } from '../../../tags.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_2,
} from '../../../framework/fixtures/FixtureBuilder.js';
import { DappVariants, Assertions } from '../../../framework/index.js';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import {
  loginToAppPlaywright,
  dismissPushNotificationExistingUserSheet,
} from '../../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../../flows/browser.flow.js';
import BrowserView from '../../../page-objects/Browser/BrowserView.js';
import TestDApp from '../../../page-objects/Browser/TestDApp.js';
import DappConnectionModal from '../../../page-objects/MMConnect/DappConnectionModal.js';
import ToastModal from '../../../page-objects/wallet/ToastModal.js';
import ChromeCdpHelpers from '../../../framework/ChromeCdpHelpers.js';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds.js';
import { openConnectedAccountsAfterConnect } from './helpers/open-connected-accounts.helpers.js';

async function setupAndNavigateToTestDapp(): Promise<void> {
  ChromeCdpHelpers.resetMetaMaskWebViewCache();
  await loginToAppPlaywright({ scenarioType: 'e2e' });
  await navigateToBrowserView();
  await dismissPushNotificationExistingUserSheet();
  await BrowserView.navigateToTestDApp();
  // On Android the WebView container and heading text must appear before
  // requestPermissions fires — window.ethereum may not yet be injected if we
  // proceed immediately. evaluateInWebView swallows the error silently.
  await waitForTestDappToLoad();
}

/**
 * The "Permissions updated" toast shown after connecting overlays the browser
 * URL bar, so taps on the account button are swallowed until it dismisses.
 */
async function openConnectedAccountsSheet(): Promise<void> {
  await ToastModal.waitForToastToDismiss();
  await BrowserView.tapNetworkAvatarOrAccountButtonOnBrowser();
}

appiumTest.describe(
  SmokeNetworkExpansion('Multiple Standard Dapp Connections'),
  () => {
    appiumTest.describe.configure({ timeout: 300_000 });

    appiumTest(
      'Defaults account selection to already permitted account when wallet_requestPermissions is called with no accounts specified',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
              .withPermissionControllerConnectedToTestDapp({
                [Caip25EndowmentPermissionName]: {
                  caveats: [
                    {
                      type: Caip25CaveatType,
                      value: {
                        optionalScopes: {
                          'eip155:1': {
                            accounts: [
                              `eip155:1:${DEFAULT_FIXTURE_ACCOUNT_2.toLowerCase()}`,
                            ],
                          },
                        },
                        requiredScopes: {},
                        sessionProperties: {},
                        isMultichainOrigin: false,
                      },
                    },
                  ],
                },
              })
              .build(),
            dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await setupAndNavigateToTestDapp();

            await TestDApp.requestPermissions();

            // The account already permitted (Account 2) should be pre-selected
            await Assertions.expectTextDisplayed('Account 2');

            await DappConnectionModal.tapConnectButton({ timeout: 15_000 });

            // Only the already-permitted EVM account should remain connected
            await openConnectedAccountsAfterConnect();
            await Assertions.expectTextDisplayed('Account 2');
          },
        );
      },
    );

    appiumTest(
      'Retains Solana permissions when connecting through the EVM provider',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await setupAndNavigateToTestDapp();

            await TestDApp.tapDappConnectButton();

            // Account 1 should be the default selection
            await Assertions.expectTextDisplayed('Account 1');

            await DappConnectionModal.tapConnectButton({ timeout: 15_000 });

            await openConnectedAccountsAfterConnect();
            await Assertions.expectTextDisplayed('Account 1');

            // Navigate to the permissions summary and open the network editor
            await DappConnectionModal.tapPermissionsTabButton();
            await DappConnectionModal.tapEditNetworksButton();

            // Both Solana and Ethereum Main Network should be visible as permitted
            await Assertions.expectElementToBeVisible(
              DappConnectionModal.getNetworkButton(
                NetworkNonPemittedBottomSheetSelectorsText.SOLANA_NETWORK_NAME,
              ),
              { timeout: 10_000 },
            );
            await Assertions.expectElementToBeVisible(
              DappConnectionModal.getNetworkButton(
                NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
              ),
              { timeout: 10_000 },
            );
          },
        );
      },
    );

    appiumTest(
      'Defaults account selection to already permitted Solana account and requested Ethereum account when wallet_requestPermissions is called with specific Ethereum account',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await setupAndNavigateToTestDapp();

            await TestDApp.requestPermissions({
              accounts: [DEFAULT_FIXTURE_ACCOUNT],
            });

            // Account 1 should be pre-selected
            await Assertions.expectTextDisplayed('Account 1');

            await DappConnectionModal.tapConnectButton({ timeout: 15_000 });

            // EVM account should be connected
            await openConnectedAccountsAfterConnect();
            await Assertions.expectTextDisplayed('Account 1');
          },
        );
      },
    );
  },
);
