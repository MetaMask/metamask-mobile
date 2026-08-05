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

appiumTest.describe(SmokeMultiChainAPI('wallet_sessionChanged'), () => {
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
    'should receive a wallet_sessionChanged event when creating a new session with different networks',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: createSessionFixture(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

          const modifiedNetworks = [
            MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
            MultichainUtilities.CHAIN_IDS.BASE,
          ];

          await MultichainTestDApp.createSessionWithNetworks(modifiedNetworks);

          const baseScope = MultichainUtilities.getEIP155Scope(
            MultichainUtilities.CHAIN_IDS.BASE,
          );

          const eventText =
            await MultichainTestDApp.getSessionChangedEventData(0);

          if (!eventText) throw new Error('Event text is null or empty');

          const parsedEvent = JSON.parse(eventText);
          const eventScopes = Object.keys(
            parsedEvent.params?.sessionScopes || {},
          );

          if (!eventScopes.includes(baseScope))
            throw new Error(
              `Base scope ${baseScope} not found in sessionChanged event`,
            );

          const eip155Capabilities =
            parsedEvent.params?.sessionProperties?.eip155Capabilities;

          if (!eip155Capabilities)
            throw new Error(
              'eip155Capabilities missing from sessionProperties',
            );

          const capabilityAddresses = Object.keys(eip155Capabilities || {}).map(
            (address) => address.toLowerCase(),
          );

          const permittedAddresses = [
            ...new Set(
              eventScopes
                .filter((scope) => scope.startsWith('eip155:'))
                .flatMap(
                  (scope) =>
                    parsedEvent.params?.sessionScopes?.[scope]?.accounts ?? [],
                )
                .map((account: string) =>
                  account.split(':').slice(-1)[0].toLowerCase(),
                ),
            ),
          ];

          if (
            permittedAddresses.length === 0 ||
            !permittedAddresses.every((address) =>
              capabilityAddresses.includes(address),
            )
          )
            throw new Error(
              'Not all permitted addresses found in eip155Capabilities',
            );
        },
      );
    },
  );
});
