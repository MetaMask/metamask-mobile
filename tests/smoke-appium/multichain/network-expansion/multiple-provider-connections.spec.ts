import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeNetworkExpansion } from '../../../tags.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_2,
} from '../../../framework/fixtures/FixtureBuilder.js';
import {
  DappVariants,
  PlaywrightAssertions,
  asPlaywrightElement,
} from '../../../framework/index.js';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import {
  loginToAppPlaywright,
  dismissPushNotificationExistingUserSheet,
} from '../../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../../flows/browser.flow.js';
import BrowserView from '../../../page-objects/Browser/BrowserView.js';
import TestDApp from '../../../page-objects/Browser/TestDApp.js';
import DappConnectionModal from '../../../page-objects/MMConnect/DappConnectionModal.js';
import ChromeCdpHelpers from '../../../framework/ChromeCdpHelpers.js';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds.js';

async function setupAndNavigateToTestDapp(): Promise<void> {
  ChromeCdpHelpers.resetMetaMaskWebViewCache();
  await loginToAppPlaywright({ scenarioType: 'e2e' });
  await navigateToBrowserView();
  await dismissPushNotificationExistingUserSheet();
  await BrowserView.navigateToTestDApp();
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
            await PlaywrightAssertions.expectTextDisplayed('Account 2');

            await DappConnectionModal.tapConnectButton({ timeout: 15_000 });

            // Only the already-permitted EVM account should remain connected
            await BrowserView.tapNetworkAvatarOrAccountButtonOnBrowser();
            await PlaywrightAssertions.expectTextDisplayed('Account 2');
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
            await PlaywrightAssertions.expectTextDisplayed('Account 1');

            await DappConnectionModal.tapConnectButton({ timeout: 15_000 });

            await BrowserView.tapNetworkAvatarOrAccountButtonOnBrowser();
            await PlaywrightAssertions.expectTextDisplayed('Account 1');

            // Navigate to the permissions summary and open the network editor
            await DappConnectionModal.tapPermissionsTabButton();
            await DappConnectionModal.tapEditNetworksButton();

            // Both Solana and Ethereum Main Network should be visible as permitted
            await PlaywrightAssertions.expectElementToBeVisible(
              await asPlaywrightElement(
                DappConnectionModal.getNetworkButton(
                  NetworkNonPemittedBottomSheetSelectorsText.SOLANA_NETWORK_NAME,
                ),
              ),
              { timeout: 10_000 },
            );
            await PlaywrightAssertions.expectElementToBeVisible(
              await asPlaywrightElement(
                DappConnectionModal.getNetworkButton(
                  NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
                ),
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
            await PlaywrightAssertions.expectTextDisplayed('Account 1');

            await DappConnectionModal.tapConnectButton({ timeout: 15_000 });

            // EVM account should be connected
            await BrowserView.tapNetworkAvatarOrAccountButtonOnBrowser();
            await PlaywrightAssertions.expectTextDisplayed('Account 1');
          },
        );
      },
    );
  },
);
