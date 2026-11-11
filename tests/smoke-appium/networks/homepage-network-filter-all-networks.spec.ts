import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import {
  loginToAppPlaywright,
  waitForWalletHomePlaywright,
} from '../../flows/wallet.flow.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensFullView from '../../page-objects/wallet/HomeSections.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { createHomepageTokensFilterFixture } from './homepage-network-filter.helpers.js';

appiumTest.describe(
  SmokeWalletPlatform('Homepage Network Filter - All Networks'),
  () => {
    appiumTest(
      'shows all tokens on homepage regardless of network filter set in tokens full view',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: createHomepageTokensFilterFixture(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer) => {
              await setupRemoteFeatureFlagsMock(mockServer, {});
            },
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await waitForWalletHomePlaywright();

            await WalletView.tapOnNewTokensSection();
            await TokensFullView.waitForVisible();

            await NetworkManager.openNetworkManager();
            await NetworkManager.tapNetwork(NetworkToCaipChainId.LINEA);
            await NetworkManager.checkBaseControlBarText(
              NetworkToCaipChainId.LINEA,
            );

            // Use checkTokenDoesNotExist (10 s) instead of checkTokenIsNotVisible
            // (3 s): the token list re-renders asynchronously after the network
            // filter changes, and 3 s was too short for slower CI runners.
            await NetworkManager.checkTokenDoesNotExist('ETH');

            await TokensFullView.tapBackButton();
            await waitForWalletHomePlaywright();

            // Use checkTokenExists rather than checkTokenIsVisible: on the
            // homepage the token list is scrollable and individual rows may be
            // below the fold (isDisplayed=false) even though they are mounted.
            await NetworkManager.checkTokenExists('SOL');
            await NetworkManager.checkTokenExists('ETH');
          },
        );
      },
    );
  },
);
