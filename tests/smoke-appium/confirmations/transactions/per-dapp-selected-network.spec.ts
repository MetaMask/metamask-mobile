import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import {
  buildPermissions,
  AnvilPort,
} from '../../../framework/fixtures/FixtureUtils.js';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import ConfirmationFooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import ConfirmationUITypes from '../../../page-objects/Browser/Confirmations/ConfirmationUITypes.js';
import TestDApp from '../../../page-objects/Browser/TestDApp.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import { SmokeConfirmations } from '../../../tags.js';
import Assertions from '../../../framework/Assertions.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../../flows/browser.flow.js';
import {
  changeNetworkFromNetworkManager,
  selectCustomNetworkFromNetworkManager,
} from '../../../flows/confirmations.flow.js';
import { DappVariants } from '../../../framework/Constants.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { confirmationFeatureFlags } from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { Mockttp } from 'mockttp';
import { LocalNode } from '../../../framework/types.js';
import { AnvilManager } from '../../../seeder/anvil-manager.js';

const LOCAL_CHAIN_ID = '0x539';
const LOCAL_CHAIN_NAME = 'Localhost';

// Skipped: Detox suite was describe.skip. Un-skip after Appium validation on main-e2e.
appiumTest.describe.skip(SmokeConfirmations('Dapp Network Switching'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  const testSpecificMock = async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(
      mockServer,
      Object.assign({}, ...confirmationFeatureFlags),
    );
  };

  appiumTest(
    'submits a transaction to a dapp-specific selected network',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
            const node = localNodes?.[0] as unknown as AnvilManager;
            const rpcPort =
              node instanceof AnvilManager
                ? (node.getPort() ?? AnvilPort())
                : undefined;

            return new FixtureBuilder()
              .withNetworkController({
                chainId: LOCAL_CHAIN_ID,
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: LOCAL_CHAIN_NAME,
                ticker: 'ETH',
              })
              .withPermissionControllerConnectedToTestDapp(
                buildPermissions([LOCAL_CHAIN_ID]),
              )
              .build();
          },
          restartDevice: true,
          testSpecificMock,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();

          await TestDApp.verifyCurrentNetworkText('Chain id ' + LOCAL_CHAIN_ID);

          await Browser.tapCloseBrowserButton();

          await Assertions.expectElementToBeVisible(
            TabBarComponent.tabBarWalletButton,
            {
              description: 'Tab bar should be visible after closing browser',
            },
          );

          await changeNetworkFromNetworkManager('Ethereum Main Network');

          await navigateToBrowserView();
          await TestDApp.verifyCurrentNetworkText('Chain id ' + LOCAL_CHAIN_ID);

          await TestDApp.tapSendEIP1559Button();

          await Assertions.expectElementToBeVisible(
            ConfirmationUITypes.ModalConfirmationContainer,
            {
              description: 'Dapp transaction confirmation modal',
            },
          );

          await Assertions.expectTextDisplayed(LOCAL_CHAIN_NAME, {
            description: 'Confirmation shows dapp-selected Localhost network',
          });

          await ConfirmationFooterActions.tapConfirmButton();

          await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
            description:
              'Browser screen should be visible after confirming transaction',
          });

          await Browser.tapCloseBrowserButton();

          await Assertions.expectElementToBeVisible(
            TabBarComponent.tabBarWalletButton,
            {
              description: 'Tab bar should be visible after closing browser',
            },
          );

          await selectCustomNetworkFromNetworkManager(LOCAL_CHAIN_NAME);

          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Confirmed', {
            description: 'Activity status Confirmed',
          });
        },
      );
    },
  );
});
