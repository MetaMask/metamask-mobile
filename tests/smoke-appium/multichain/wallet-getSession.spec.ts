import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeMultiChainAPI } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { createSessionFixture } from './multichain-fixtures.js';
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

const multichainDappServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.MULTICHAIN_TEST_DAPP].dappPath,
  dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
});

appiumTest.describe(SmokeMultiChainAPI('wallet_getSession'), () => {
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
    'should successfully receive empty session scopes when there is no existing session',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: createSessionFixture(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp();
          await MultichainTestDApp.scrollToPageTop();
          await MultichainTestDApp.useAutoConnectButton();
          await MultichainTestDApp.tapGetSessionButton();

          const sessionResult = await MultichainTestDApp.getSessionData();
          const assertions = MultichainUtilities.generateSessionAssertions(
            sessionResult,
            [],
          );

          if (!assertions.structureValid)
            throw new Error('Invalid session structure');

          if (assertions.success && assertions.chainCount > 0)
            throw new Error(
              `Expected empty session scopes, but found ${assertions.chainCount} chains`,
            );

          if (
            sessionResult.sessionScopes &&
            Object.keys(sessionResult.sessionScopes).length > 0
          )
            throw new Error('Expected empty session scopes object');
        },
      );
    },
  );

  appiumTest(
    'should return correct and consistent session scopes for selected chains',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: createSessionFixture(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp();
          const networksToTest =
            MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;

          await MultichainTestDApp.createSessionWithNetworks(networksToTest);

          await MultichainTestDApp.tapGetSessionButton();
          const getSessionResult1 = await MultichainTestDApp.getSessionData();
          await MultichainTestDApp.tapGetSessionButton();
          const getSessionResult2 = await MultichainTestDApp.getSessionData();
          await MultichainTestDApp.tapGetSessionButton();
          const getSessionResult3 = await MultichainTestDApp.getSessionData();

          const assertions1 = MultichainUtilities.generateSessionAssertions(
            getSessionResult1,
            networksToTest,
          );
          const assertions2 = MultichainUtilities.generateSessionAssertions(
            getSessionResult2,
            networksToTest,
          );
          const assertions3 = MultichainUtilities.generateSessionAssertions(
            getSessionResult3,
            networksToTest,
          );

          if (!assertions1.structureValid)
            throw new Error('Invalid session structure');

          if (
            !assertions1.success ||
            !assertions2.success ||
            !assertions3.success
          )
            throw new Error('One or more getSession calls failed');

          if (!assertions1.chainsValid) {
            MultichainUtilities.logSessionDetails(
              getSessionResult1,
              'Failed Session Validation',
            );
            throw new Error(
              `Chain validation failed. Missing chains: ${assertions1.missingChains.join(', ')}`,
            );
          }

          if (assertions1.chainCount !== networksToTest.length)
            throw new Error(
              `Expected ${networksToTest.length} chain(s), but found ${assertions1.chainCount}`,
            );

          const expectedScope = MultichainUtilities.getEIP155Scope(
            MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
          );
          if (!getSessionResult1.sessionScopes?.[expectedScope])
            throw new Error(
              `Expected session scope ${expectedScope} not found`,
            );

          const ethereumScope = getSessionResult1.sessionScopes[expectedScope];
          if (!ethereumScope.accounts || ethereumScope.accounts.length === 0)
            throw new Error('Expected session scope to have accounts');

          const scopes1 = JSON.stringify(getSessionResult1.sessionScopes);
          const scopes2 = JSON.stringify(getSessionResult2.sessionScopes);
          const scopes3 = JSON.stringify(getSessionResult3.sessionScopes);

          if (scopes1 !== scopes2 || scopes2 !== scopes3)
            throw new Error('Session data inconsistent across multiple calls');

          if (
            assertions1.chainCount !== assertions2.chainCount ||
            assertions2.chainCount !== assertions3.chainCount
          )
            throw new Error(
              `Chain count inconsistent: ${assertions1.chainCount}, ${assertions2.chainCount}, ${assertions3.chainCount}`,
            );
        },
      );
    },
  );

  appiumTest(
    'should handle getSession after session has been modified',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: createSessionFixture(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp();

          const initialNetworks =
            MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;

          await MultichainTestDApp.createSessionWithNetworks(initialNetworks);
          await MultichainTestDApp.tapGetSessionButton();

          const getSessionResult1 = await MultichainTestDApp.getSessionData();
          const getAssertions1 = MultichainUtilities.generateSessionAssertions(
            getSessionResult1,
            initialNetworks,
          );

          if (!getAssertions1.success || getAssertions1.chainCount === 0)
            throw new Error('Initial session validation failed');

          const newNetworks = [
            MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
            MultichainUtilities.CHAIN_IDS.BSC,
            MultichainUtilities.CHAIN_IDS.BASE,
          ];

          await MultichainTestDApp.createSessionWithNetworks(newNetworks);

          const getSessionResult2 = await MultichainTestDApp.getSessionData();
          const getAssertions2 = MultichainUtilities.generateSessionAssertions(
            getSessionResult2,
            newNetworks,
          );

          if (!getAssertions2.success)
            throw new Error('New session creation failed');

          if (!getAssertions2.chainsValid) {
            MultichainUtilities.logSessionDetails(
              getSessionResult2,
              'Failed Session Validation',
            );
            throw new Error(
              `Chain validation failed. Missing chains: ${getAssertions2.missingChains.join(', ')}`,
            );
          }

          if (getAssertions2.chainCount !== newNetworks.length)
            throw new Error(
              `Expected ${newNetworks.length} chain(s), but found ${getAssertions2.chainCount}`,
            );
        },
      );
    },
  );
});
