import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeNetworkAbstractions } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils.js';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers.js';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers.js';
import { TestDappSelectorsWebIDs } from '../../selectors/Browser/TestDapp.selectors.js';
import { getDriver } from '../../framework/PlaywrightUtilities.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants.js';
import Assertions from '../../framework/Assertions.js';
import { DappVariants } from '../../framework/Constants.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import Browser from '../../page-objects/Browser/BrowserView.js';
import ConnectedAccountsModal from '../../page-objects/Browser/ConnectedAccountsModal.js';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet.js';
import { CustomNetworks } from '../../resources/networks.e2e.js';
import type { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';

const POLYGON = CustomNetworks.Tenderly.Polygon.providerConfig.nickname;

appiumTest.describe(SmokeNetworkAbstractions('Network Manager'), () => {
  // Appium Android: wallet_switchEthereumChain from the in-app browser webview does not
  // surface the native MultichainAccountConnect permission sheet (Detox passes the same flow).
  // Tracked on MMQA-1995 — unblock when browser webview ↔ native RPC bridge is reliable in Appium.
  appiumTest.fixme(
    'should preserve existing enabled networks when adding a network via dapp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const dappTestMock = async (mockServer: Mockttp) => {
        await setupRemoteFeatureFlagsMock(mockServer, {
          carouselBanners: false,
        });
      };

      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .withNetworkEnabledMap({
              eip155: { '0x1': true },
            })
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission()
            .withPopularNetworks()
            .withBrowserActiveTabUrl(getDappUrl(0))
            .build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: dappTestMock,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await NetworkManager.openNetworkManagerFromHomepage();
          await NetworkManager.waitForNetworkManagerToLoad();
          await NetworkManager.checkPopularNetworksContainerIsVisible();
          await NetworkManager.checkTabIsSelected('Popular');
          await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM,
          );
          await NetworkManager.navigateBackFromTokensFullView();

          await navigateToBrowserView();
          await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
            timeout: 15000,
            description: 'Browser screen should be visible',
          });

          await PlaywrightContextHelpers.withWebAction(async () => {
            const driver = getDriver();
            await driver.url(getDappUrl(0));
            await driver.waitUntil(
              async () => {
                const hasProvider = await driver.execute(() =>
                  Boolean(
                    (
                      window as Window & {
                        ethereum?: { isMetaMask?: boolean };
                      }
                    ).ethereum?.isMetaMask,
                  ),
                );
                return Boolean(hasProvider);
              },
              {
                timeout: 20000,
                timeoutMsg:
                  'MetaMask provider did not inject into test dapp webview',
              },
            );

            const openPicker = await PlaywrightMatchers.getElementByXPath(
              `//*[@id="${TestDappSelectorsWebIDs.OPEN_NETWORK_PICKER}"]`,
            );
            await openPicker.waitForDisplayed({ timeout: 15000 });
            await openPicker.click();
            const networkItem = await PlaywrightMatchers.getElementByXPath(
              `//div[contains(@class, "network-modal-item-name") and contains(text(), "${POLYGON}")]`,
            );
            await networkItem.waitForDisplayed({ timeout: 10000 });
            await networkItem.click();
            await driver.pause(3000);
          }, getDappUrl(0));

          await PlaywrightContextHelpers.withNativeAction(async () => {
            await Assertions.expectElementToBeVisible(
              ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
              {
                timeout: 30000,
                description:
                  'edit networks permissions button should be visible',
              },
            );
            await Assertions.expectTextDisplayed('Use your enabled networks', {
              description: 'permissions copy should mention enabled networks',
            });
            await Assertions.expectTextDisplayed(
              `Requesting for ${POLYGON} Mainnet`,
              {
                description:
                  'permissions copy should mention requested network',
              },
            );
            await Assertions.expectElementToBeVisible(
              ConnectBottomSheet.connectButton,
            );
          });

          await ConnectBottomSheet.tapConnectButton();
          await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
            description: 'Browser screen should be visible after connecting',
          });
          await Browser.tapCloseBrowserButton();
          await TabBarComponent.tapWallet();
          await NetworkManager.navigateToTokensFullView();
          await NetworkManager.checkBaseControlBarText(
            NetworkToCaipChainId.ETHEREUM,
          );
        },
      );
    },
  );
});
