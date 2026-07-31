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

appiumTest.describe(SmokeMultiChainAPI('wallet_revokeSession'), () => {
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
    'should return empty object from wallet_getSession call after revoking session',
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

          const sessionBeforeRevoke = await MultichainTestDApp.getSessionData();
          const assertionsBeforeRevoke =
            MultichainUtilities.generateSessionAssertions(
              sessionBeforeRevoke,
              networksToTest,
            );

          if (
            !assertionsBeforeRevoke.success ||
            assertionsBeforeRevoke.chainCount === 0
          )
            throw new Error(
              'Session should have non-empty scopes before revoke',
            );

          await MultichainTestDApp.tapRevokeSessionButton();

          const sessionAfterRevoke = await MultichainTestDApp.getSessionData();
          const assertionsAfterRevoke =
            MultichainUtilities.generateSessionAssertions(
              sessionAfterRevoke,
              [],
            );

          if (!assertionsAfterRevoke.structureValid)
            throw new Error('Invalid session structure after revoke');

          if (
            assertionsAfterRevoke.success &&
            assertionsAfterRevoke.chainCount > 0
          ) {
            MultichainUtilities.logSessionDetails(
              sessionAfterRevoke,
              'Unexpected Session After Revoke',
            );
            throw new Error(
              `Expected empty session scopes after revoke, but found ${assertionsAfterRevoke.chainCount} chains`,
            );
          }

          if (
            sessionAfterRevoke.sessionScopes &&
            Object.keys(sessionAfterRevoke.sessionScopes).length > 0
          )
            throw new Error(
              'Expected empty session scopes object after revoke',
            );
        },
      );
    },
  );
});
