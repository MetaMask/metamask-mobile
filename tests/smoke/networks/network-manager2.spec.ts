import { SmokeNetworkAbstractions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../flows/browser.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import NetworkManager from '../../page-objects/wallet/NetworkManager';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import Assertions from '../../framework/Assertions';
import { DappVariants } from '../../framework/Constants';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import Browser from '../../page-objects/Browser/BrowserView';
import TestDApp from '../../page-objects/Browser/TestDApp';
import ConnectedAccountsModal from '../../page-objects/Browser/ConnectedAccountsModal';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet';
import { CustomNetworks } from '../../resources/networks.e2e';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { getDappUrlForFixture } from '../../framework/fixtures/FixtureUtils';

const POLYGON = CustomNetworks.Tenderly.Polygon.providerConfig.nickname;

describe(SmokeNetworkAbstractions('Network Manager'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  it('should preserve existing enabled networks when adding a network via dapp', async () => {
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
        fixture: (() => {
          const built = new FixtureBuilder()
            .withNetworkEnabledMap({
              eip155: { '0x1': true }, // Ethereum Mainnet enabled
            })
            .withPermissionControllerConnectedToTestDapp()
            .withChainPermission()
            .withPopularNetworks()
            .build();
          // Default tab URL is …/health-check; open the test dapp directly.
          built.state.browser.tabs[0].url = getDappUrlForFixture(0);
          return built;
        })(),
        restartDevice: true,
        testSpecificMock: dappTestMock,
      },
      async () => {
        await loginToApp();

        // Step 1: Navigate to TokensFullView, then select Ethereum
        await NetworkManager.openNetworkManagerFromHomepage();
        await NetworkManager.waitForNetworkManagerToLoad();
        await NetworkManager.checkPopularNetworksContainerIsVisible();
        await NetworkManager.checkTabIsSelected('Popular');

        // Select Ethereum as the active network — sheet closes, lands on TokensFullView
        await NetworkManager.tapNetwork(NetworkToCaipChainId.ETHEREUM);
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM,
        );

        // Go back to homepage before navigating to browser
        await NetworkManager.navigateBackFromTokensFullView();

        // Step 2: Navigate to dapp and request network addition
        await navigateToBrowserView();
        await waitForTestDappToLoad();
        await TestDApp.tapOpenNetworkPicker();
        await TestDApp.tapNetworkByName(POLYGON);

        // Verify the permission request UI.
        // The button auto-aggregates two text children ("Use your enabled
        // networks" + "Requesting for <network> Mainnet") into one a11y label.
        // iOS UIAccessibility joins those with ", " (RN 0.81 behavior change).
        const expectedText = `Use your enabled networks, Requesting for ${POLYGON} Mainnet`;
        await Assertions.expectElementToHaveLabel(
          ConnectedAccountsModal.navigateToEditNetworksPermissionsButton,
          expectedText,
          {
            description: `edit networks permissions button should show "${expectedText}"`,
          },
        );
        await Assertions.expectElementToBeVisible(
          ConnectBottomSheet.connectButton,
        );

        // Step 3: Approve the network addition
        await ConnectBottomSheet.tapConnectButton();

        // Wait for browser screen to be visible after connection modal dismisses
        await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
          description: 'Browser screen should be visible after connecting',
        });

        // Step 4: Close browser to reveal app tab bar, then return to wallet
        await Browser.tapCloseBrowserButton();
        await TabBarComponent.tapWallet();

        // Navigate to TokensFullView to verify Ethereum is still the active network
        await NetworkManager.navigateToTokensFullView();
        await NetworkManager.checkBaseControlBarText(
          NetworkToCaipChainId.ETHEREUM,
        );
      },
    );
  });
});
