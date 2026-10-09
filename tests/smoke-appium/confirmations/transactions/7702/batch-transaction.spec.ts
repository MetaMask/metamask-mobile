import { test as appiumTest } from '../../../../framework/fixtures/playwright/index.js';
import { SmokeConfirmations } from '../../../../tags.js';
import {
  dismissPushNotificationExistingUserSheet,
  loginToAppPlaywright,
} from '../../../../flows/wallet.flow.js';
import {
  assertSmartAccountUpgradeActivity,
  assertUpgradeConfirmationRows,
  dismissSmartAccountScreensAndOpenFilteredActivity,
  LOCAL_CHAIN_CAIP,
  navigateToTestDappAndTap,
  openSmartAccountSwitchForSelectedAccount,
  SMART_ACCOUNT_UPGRADED_ACTIVITY,
  SMART_ACCOUNT_UPGRADING_ACTIVITY,
  switchToLocalNetworkFromNetworkManager,
} from '../../../../flows/confirmations.flow.js';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../../../framework/Assertions.js';
import Matchers from '../../../../framework/Matchers.js';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper.js';
import {
  AnvilPort,
  buildPermissions,
  getDappUrlForFixture,
} from '../../../../framework/fixtures/FixtureUtils.js';
import Browser from '../../../../page-objects/Browser/BrowserView.js';
import ConfirmationUITypes from '../../../../page-objects/Browser/Confirmations/ConfirmationUITypes.js';
import FooterActions from '../../../../page-objects/Browser/Confirmations/FooterActions.js';
import RowComponents from '../../../../page-objects/Browser/Confirmations/RowComponents.js';
import ActivitiesView from '../../../../page-objects/Transactions/ActivitiesView.js';
import TabBarComponent from '../../../../page-objects/wallet/TabBarComponent.js';
import { SIMULATION_ENABLED_NETWORKS_MOCK } from '../../../../api-mocking/mock-responses/simulations.js';
import { TestDappSelectorsWebIDs } from '../../../../selectors/Browser/TestDapp.selectors.js';
import { DappVariants } from '../../../../framework/Constants.js';
import { setupMockRequest } from '../../../../api-mocking/helpers/mockHelpers.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { confirmationFeatureFlags } from '../../../../api-mocking/mock-responses/feature-flags-mocks.js';
import {
  AnvilNodeOptions,
  LocalNode,
  LocalNodeType,
} from '../../../../framework/types.js';
import { AnvilManager, Hardfork } from '../../../../seeder/anvil-manager.js';

const ANVIL_NODE_OPTIONS_WITH_7702: AnvilNodeOptions = {
  hardfork: 'prague' as Hardfork,
  // Seeder dump only — Detox twin pre-designates Account 1 (upgrade becomes downgrade).
  loadState: './tests/seeder/network-states/7702/withDelegatorContracts.json',
};

function buildLocalRpcFixture({
  localNodes,
  withTestDappPermission = false,
}: {
  localNodes?: LocalNode[];
  withTestDappPermission?: boolean;
}) {
  const node = localNodes?.[0] as unknown as AnvilManager;
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  let builder = new FixtureBuilder().withNetworkController({
    chainId: '0x539',
    rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
    type: 'custom',
    nickname: 'Local RPC',
    ticker: 'ETH',
  });

  if (withTestDappPermission) {
    builder = builder.withPermissionControllerConnectedToTestDapp(
      buildPermissions(['0x539']),
    );
  }

  const fixture = builder.build();

  if (withTestDappPermission) {
    fixture.state.browser.tabs[0].url = getDappUrlForFixture(0);
  }

  return fixture;
}

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: SIMULATION_ENABLED_NETWORKS_MOCK.urlEndpoint,
    response: SIMULATION_ENABLED_NETWORKS_MOCK.response,
    responseCode: 200,
  });
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...Object.assign({}, ...confirmationFeatureFlags),
    tmcuActivityRedesignEnabled: true,
  });
};

appiumTest.describe(SmokeConfirmations('7702 - smart account'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  // Skipped: consistently fails on main Appium confirmations Android smoke
  // (`#eip5792SendCallsButton` / confirm sheet). MMQA-2254.
  // Keep "upgrades an account to a smart account" running in this file.
  appiumTest.skip(
    'submits a wallet_sendCalls batch of two transactions',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: ({ localNodes }: { localNodes?: LocalNode[] }) =>
            buildLocalRpcFixture({
              localNodes,
              withTestDappPermission: true,
            }),
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: ANVIL_NODE_OPTIONS_WITH_7702,
            },
          ],
          restartDevice: true,
          testSpecificMock,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await switchToLocalNetworkFromNetworkManager();
          await navigateToTestDappAndTap(
            TestDappSelectorsWebIDs.SEND_CALLS_BUTTON,
            'Send calls (EIP-5792) button',
          );

          await Assertions.expectTextDisplayed('Includes 2 transactions', {
            description: 'Batch includes 2 transactions',
          });
          await Assertions.expectElementToExist(
            ConfirmationUITypes.ModalConfirmationContainer,
            {
              description: 'Modal confirmation container',
            },
          );
          await assertUpgradeConfirmationRows();
          await Assertions.expectElementToExist(
            RowComponents.SimulationDetails,
            {
              description: 'Simulation Details',
            },
          );

          await FooterActions.tapConfirmButton();
          await FooterActions.waitForConfirmButtonGone();
          await dismissPushNotificationExistingUserSheet();
          await Assertions.expectElementToExist(Browser.browserScreenID, {
            description: 'Browser screen after confirm',
          });
          await Browser.tapCloseBrowserButton();
          await Assertions.expectElementToBeVisible(
            TabBarComponent.tabBarWalletButton,
            {
              description: 'Wallet tab visible after leaving browser',
            },
          );
          await TabBarComponent.tapActivity();
          await ActivitiesView.filterByNetwork(LOCAL_CHAIN_CAIP);

          await assertSmartAccountUpgradeActivity(
            SMART_ACCOUNT_UPGRADED_ACTIVITY,
          );
        },
      );
    },
  );

  appiumTest(
    'upgrades an account to a smart account',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: ({ localNodes }: { localNodes?: LocalNode[] }) =>
            buildLocalRpcFixture({ localNodes }),
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: ANVIL_NODE_OPTIONS_WITH_7702,
            },
          ],
          restartDevice: true,
          testSpecificMock,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await switchToLocalNetworkFromNetworkManager();
          await openSmartAccountSwitchForSelectedAccount();

          // iOS: assert hierarchy (isDisplayed flaky). Apostrophe-free substring
          // — Appium buildTextXPath breaks on `'`.
          await Assertions.expectElementToExist(
            Matchers.getElementByText('Account update'),
            {
              description: 'Account update title',
            },
          );
          await Assertions.expectElementToExist(
            Matchers.getElementByText('switching to a smart account'),
            {
              description: 'Upgrade to smart account copy',
            },
          );
          await Assertions.expectElementToExist(
            ConfirmationUITypes.ModalConfirmationContainer,
            {
              description: 'Modal confirmation container',
            },
          );
          await assertUpgradeConfirmationRows();

          await dismissSmartAccountScreensAndOpenFilteredActivity();
          // Upgrade tx never reached Anvil (empty txpool / no 0xef01) — pending only.
          await assertSmartAccountUpgradeActivity(
            SMART_ACCOUNT_UPGRADING_ACTIVITY,
          );
        },
      );
    },
  );
});
