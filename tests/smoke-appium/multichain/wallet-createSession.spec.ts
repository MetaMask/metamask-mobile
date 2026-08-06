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

appiumTest.describe(SmokeMultiChainAPI('wallet_createSession'), () => {
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
    'should create a session with Ethereum mainnet scope',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: createSessionFixture(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp();
          await MultichainTestDApp.createSessionWithNetworks(
            MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM,
          );
          const sessionResult = await MultichainTestDApp.getSessionData();

          const assertions = MultichainUtilities.generateSessionAssertions(
            sessionResult,
            MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM,
          );

          MultichainUtilities.logSessionDetails(
            sessionResult,
            'Single Ethereum Test',
          );

          if (!assertions.structureValid)
            throw new Error('Invalid session structure');
          if (!assertions.success) throw new Error('Session creation failed');
          if (!assertions.chainsValid)
            throw new Error(
              `Chain validation failed. Missing chains: ${assertions.missingChains.join(', ')}`,
            );
          if (assertions.chainCount !== 1)
            throw new Error(
              `Expected 1 chain, but found ${assertions.chainCount}`,
            );
        },
      );
    },
  );

  appiumTest(
    'should create a session with multiple EVM chains',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: createSessionFixture(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp();
          await MultichainTestDApp.createSessionWithNetworks(
            MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_POLYGON,
          );
          const sessionResult = await MultichainTestDApp.getSessionData();

          const assertions = MultichainUtilities.generateSessionAssertions(
            sessionResult,
            MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_POLYGON,
          );

          MultichainUtilities.logSessionDetails(
            sessionResult,
            'Multi-chain Test',
          );

          if (!assertions.structureValid)
            throw new Error('Invalid session structure');
          if (!assertions.success) throw new Error('Session creation failed');
          if (!assertions.chainsValid)
            throw new Error(
              `Chain validation failed. Missing chains: ${assertions.missingChains.join(', ')}`,
            );
          if (assertions.chainCount !== 2)
            throw new Error(
              `Expected 2 chains, but found ${assertions.chainCount}`,
            );
        },
      );
    },
  );

  appiumTest(
    'should create a session with all available EVM networks',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: createSessionFixture(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp();
          await MultichainTestDApp.createSessionWithNetworks(
            MultichainUtilities.NETWORK_COMBINATIONS.ALL_MAJOR_EVM,
          );
          const sessionResult = await MultichainTestDApp.getSessionData();

          const assertions = MultichainUtilities.generateSessionAssertions(
            sessionResult,
            MultichainUtilities.NETWORK_COMBINATIONS.ALL_MAJOR_EVM,
          );

          MultichainUtilities.logSessionDetails(
            sessionResult,
            'All Networks Test',
          );

          if (!assertions.structureValid)
            throw new Error('Invalid session structure');
          if (!assertions.success) throw new Error('Session creation failed');
          if (
            !assertions.foundChains.includes(
              MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
            )
          )
            throw new Error('Ethereum mainnet not found in session scopes');
          if (assertions.chainCount <= 1)
            throw new Error(
              `Expected multiple chains, but found ${assertions.chainCount}`,
            );
        },
      );
    },
  );

  appiumTest(
    'should handle session creation with no networks selected',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: createSessionFixture(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp();
          await MultichainTestDApp.createSessionWithNetworks([]);

          const sessionResult = { success: false, sessionScopes: {} };
          const assertions = MultichainUtilities.generateSessionAssertions(
            sessionResult,
            [],
          );
          MultichainUtilities.logSessionDetails(
            sessionResult,
            'No Networks Test',
          );

          if (!assertions.structureValid)
            throw new Error('Invalid session result type');
          if (assertions.success || assertions.chainCount > 0)
            throw new Error(
              'Expected session creation to fail with no networks selected, but it succeeded',
            );
        },
      );
    },
  );
});
