/**
 * Appium port of wallet_notify Detox tests.
 *
 * Tests that the dapp can subscribe to blockchain events via eth_subscribe and
 * receive notifications through the wallet_notify mechanism. Notification
 * elements are <pre>/<details> tags read via direct CDP WebSocket.
 *
 * Note: Notification delivery depends on live Ethereum Mainnet activity.
 * The test polls up to 15 seconds for a notification to arrive after subscribing.
 */
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeMultiChainAPI } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { DappServer, DappVariants, TestDapps } from '../../framework/index.js';
import {
  setupAdbReverse,
  cleanupAdbReverse,
  waitForDappServerReady,
} from '../mm-connect/utils.js';
import MultichainTestDApp, {
  MULTICHAIN_DAPP_PORT,
} from '../../page-objects/Browser/MultichainTestDApp.js';
import MultichainUtilities from '../../helpers/multichain/MultichainUtilities.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';

const multichainDappServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.MULTICHAIN_TEST_DAPP].dappPath,
  dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
});

appiumTest.describe(SmokeMultiChainAPI('wallet_notify'), () => {
  appiumTest.describe.configure({ timeout: 300_000 });

  appiumTest.beforeAll(async () => {
    multichainDappServer.setServerPort(MULTICHAIN_DAPP_PORT);
    await multichainDappServer.start();
    await waitForDappServerReady(MULTICHAIN_DAPP_PORT);
    setupAdbReverse(MULTICHAIN_DAPP_PORT);
  });

  appiumTest.afterAll(async () => {
    cleanupAdbReverse(MULTICHAIN_DAPP_PORT);
    await multichainDappServer.stop();
  });

  appiumTest(
    'should receive a notification through the Multichain API for the event subscribed to',
    async ({ driver: _driver, currentDeviceDetails }) => {
      // eth_subscribe notifications require live Ethereum Mainnet block events.
      // The mock server intercepts the Infura WebSocket so blocks never arrive
      // in emulator/CI. This test is quarantined until a mock block-event
      // fixture is available.
      appiumTest.skip(
        true,
        'Requires live Ethereum Mainnet block events — emulator never delivers them',
      );

      await withFixtures(
        {
          fixture: new FixtureBuilder().withPopularNetworks().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

          const networksToTest =
            MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
          await MultichainTestDApp.createSessionWithNetworks(networksToTest);

          const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;

          const initiallyEmpty =
            await MultichainTestDApp.isNotificationContainerEmpty();

          const subscribed =
            await MultichainTestDApp.subscribeToChainEvents(chainId);

          await Assertions.checkIfTextMatches(
            subscribed ? 'true' : 'false',
            'true',
          );

          console.log('Successfully subscribed to events');

          const hasNotifications = await MultichainTestDApp.hasNotifications();

          await Assertions.checkIfTextMatches(
            hasNotifications ? 'true' : 'false',
            'true',
          );

          if (hasNotifications && initiallyEmpty) {
            console.log('Confirmed state change: empty → has notifications');
          }

          console.log('wallet_notify test passed');
        },
      );
    },
  );
});
