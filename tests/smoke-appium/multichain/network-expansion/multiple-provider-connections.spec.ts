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
  PlaywrightMatchers,
  PlaywrightGestures,
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
import DappConnectionModal from '../../../page-objects/MMConnect/DappConnectionModal.js';
import ChromeCdpHelpers from '../../../framework/ChromeCdpHelpers.js';
import { getDappUrl } from '../../../framework/fixtures/FixtureUtils.js';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds.js';

// Calls wallet_requestPermissions in the TestDApp WebView via CDP.
async function requestPermissions({
  accounts,
}: { accounts?: string[] } = {}): Promise<void> {
  const request = JSON.stringify({
    jsonrpc: '2.0',
    method: 'wallet_requestPermissions',
    params: [
      {
        eth_accounts: accounts
          ? { caveats: [{ type: 'restrictReturnedAccounts', value: accounts }] }
          : {},
      },
    ],
  });
  await ChromeCdpHelpers.evaluateInWebView(
    getDappUrl(0),
    `window.ethereum.request(${request})`,
  );
}

// Clicks #connectButton in the TestDApp WebView (eth_requestAccounts flow).
async function connectTestDapp(): Promise<void> {
  await ChromeCdpHelpers.evaluateInWebView(
    getDappUrl(0),
    `document.querySelector('#connectButton')?.click()`,
  );
}

// Taps the in-browser account / network avatar button to open the connected
// accounts sheet.
async function tapNetworkAvatarButton(): Promise<void> {
  const el = await PlaywrightMatchers.getElementById('navbar-account-button');
  await PlaywrightGestures.waitAndTap(el, {
    checkForDisplayed: true,
    timeout: 10_000,
  });
}

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

            await requestPermissions();

            // The account already permitted (Account 2) should be pre-selected
            await PlaywrightAssertions.expectTextDisplayed('Account 2');

            await DappConnectionModal.tapConnectButton({ timeout: 15_000 });

            // Only the already-permitted EVM account should remain connected
            await tapNetworkAvatarButton();
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

            await connectTestDapp();

            // Account 1 should be the default selection
            await PlaywrightAssertions.expectTextDisplayed('Account 1');

            await DappConnectionModal.tapConnectButton({ timeout: 15_000 });

            await tapNetworkAvatarButton();
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

            await requestPermissions({
              accounts: [DEFAULT_FIXTURE_ACCOUNT],
            });

            // Account 1 should be pre-selected
            await PlaywrightAssertions.expectTextDisplayed('Account 1');

            await DappConnectionModal.tapConnectButton({ timeout: 15_000 });

            // EVM account should be connected
            await tapNetworkAvatarButton();
            await PlaywrightAssertions.expectTextDisplayed('Account 1');
          },
        );
      },
    );
  },
);
