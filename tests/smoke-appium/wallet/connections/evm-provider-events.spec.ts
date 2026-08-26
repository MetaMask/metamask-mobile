import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../../tags.js';
import Assertions from '../../../framework/Assertions.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT_2,
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
} from '../../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal.js';
import NetworkConnectMultiSelector from '../../../page-objects/Browser/NetworkConnectMultiSelector.js';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet.js';
import { NetworkNonPemittedBottomSheetSelectorsText } from '../../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../../flows/browser.flow.js';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { DappVariants } from '../../../framework/Constants.js';
import ToastModal from '../../../page-objects/wallet/ToastModal.js';
import AccountListBottomSheet from '../../../page-objects/wallet/AccountListBottomSheet.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';

/**
 * Open the browser connected-accounts sheet and assert the active account
 * (and optionally a permitted network) from native UI — avoids WebView DOM.
 */
async function assertConnectedAccountFromNativeUi(
  accountName: string,
  networkName?: string,
): Promise<void> {
  await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
  await Assertions.expectTextDisplayed(accountName, {
    description: `Connected accounts modal should show ${accountName}`,
  });
  await Assertions.expectElementToNotBeVisible(ToastModal.notificationTitle);

  if (networkName) {
    await ConnectedAccountsModal.tapPermissionsSummaryTab();
    await Assertions.expectTextDisplayed(networkName, {
      description: `Permissions should show network ${networkName}`,
    });
  }
}

appiumTest.describe(SmokeWalletPlatform('EVM Provider Events'), () => {
  appiumTest.describe.configure({ timeout: 150000 });

  appiumTest(
    'notifies the connected account and chain on load of a permitted dapp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
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

          // Native UI reflects the permitted account (Account 1) and chain
          // (Ethereum Main Network / 0x1) without reading the dapp WebView.
          await assertConnectedAccountFromNativeUi(
            'Account 1',
            NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
          );
        },
      );
    },
  );

  appiumTest(
    'notifies a dapp when the wallet switches to an account it has permission to access. ',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
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
                            `eip155:1:${DEFAULT_FIXTURE_ACCOUNT_CHECKSUM}`,
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
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();
          await waitForTestDappToLoad();

          await assertConnectedAccountFromNativeUi('Account 1');
          await Assertions.expectTextDisplayed('Account 2', {
            description:
              'Both permitted accounts should appear in the connected accounts modal',
          });
          await ConnectBottomSheet.tapCancelButton();
          await Browser.tapCloseBrowserButton();
          await Assertions.expectElementToBeVisible(
            TabBarComponent.tabBarWalletButton,
          );
          await TabBarComponent.tapWallet();
          await WalletView.tapIdenticon();
          await AccountListBottomSheet.tapAccountByNameV2('Account 2');
          await navigateToBrowserView();
          await waitForTestDappToLoad();

          // Active account is now Account 2 (native proxy for accountsChanged).
          await assertConnectedAccountFromNativeUi('Account 2');
          await ConnectBottomSheet.tapCancelButton();
        },
      );
    },
  );

  appiumTest(
    'notifies a permitted dapp of the new chain ID when the network changes',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withPermissionControllerConnectedToTestDapp({
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      optionalScopes: {
                        'eip155:1': {
                          accounts: [
                            `eip155:1:${DEFAULT_FIXTURE_ACCOUNT_CHECKSUM}`,
                          ],
                        },
                        'eip155:1337': {
                          accounts: [
                            `eip155:1337:${DEFAULT_FIXTURE_ACCOUNT_CHECKSUM}`,
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
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();
          await waitForTestDappToLoad();

          // Two permitted chains surface as "2 networks connected" (Localhost +
          // Ethereum), not the individual network names.
          await assertConnectedAccountFromNativeUi(
            'Account 1',
            '2 networks connected',
          );

          await ConnectedAccountsModal.tapNavigateToEditNetworksPermissionsButton();
          await NetworkConnectMultiSelector.selectNetworkChainPermission(
            'Ethereum Main Network',
          );
          await NetworkConnectMultiSelector.tapUpdateButton();

          // Remaining permitted chain is Localhost (0x539) — native proxy for
          // chainChanged instead of reading #chainId from the WebView.
          await ConnectedAccountsModal.tapPermissionsSummaryTab();
          await Assertions.expectTextDisplayed('Localhost', {
            description:
              'After removing Ethereum Mainnet, Localhost should remain',
          });
          await ConnectBottomSheet.tapCancelButton();
        },
      );
    },
  );
});
