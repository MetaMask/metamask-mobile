/**
 * Appium port of wallet_invokeMethod Detox tests.
 *
 * Result elements (invoke-method-*-result-*) are <pre> tags — invisible to
 * UiAutomator. They are read via direct CDP WebSocket in MultichainTestDApp.
 */
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
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';

const multichainDappServer = new DappServer({
  dappCounter: 0,
  rootDirectory: TestDapps[DappVariants.MULTICHAIN_TEST_DAPP].dappPath,
  dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
});

appiumTest.describe(SmokeMultiChainAPI('wallet_invokeMethod'), () => {
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

  appiumTest.describe('Read operations', () => {
    appiumTest(
      'should match selected method to the expected output for eth_chainId',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withPopularNetworks().build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await MultichainTestDApp.setupAndNavigateToTestDapp(
              '?autoMode=true',
            );

            const networksToTest =
              MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_POLYGON;
            await MultichainTestDApp.createSessionWithNetworks(networksToTest);

            const sessionData = await MultichainTestDApp.getSessionData();
            const sessionAssertions =
              MultichainUtilities.generateSessionAssertions(
                sessionData,
                networksToTest,
              );
            if (
              !sessionAssertions.success ||
              sessionAssertions.chainCount !== networksToTest.length
            ) {
              throw new Error(
                `Session validation failed. Expected ${networksToTest.length} chains, got ${sessionAssertions.chainCount}`,
              );
            }

            const method = 'eth_chainId';
            const expectedResults: Record<string, string> = {
              [MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET]: '"0x1"',
              [MultichainUtilities.CHAIN_IDS.POLYGON]: '"0x89"',
            };

            for (const chainId of networksToTest) {
              const invoked = await MultichainTestDApp.invokeMethodOnChain(
                chainId,
                method,
              );
              if (!invoked) {
                throw new Error(
                  `Failed to invoke ${method} on chain ${chainId}`,
                );
              }

              const resultText = await MultichainTestDApp.getInvokeMethodResult(
                chainId,
                method,
                0,
              );
              if (!resultText) {
                throw new Error(
                  `Failed to get result for ${method} on chain ${chainId}`,
                );
              }

              if (resultText !== expectedResults[chainId]) {
                throw new Error(
                  `Chain ${chainId}: expected ${expectedResults[chainId]}, got ${resultText}`,
                );
              }
            }
          },
        );
      },
    );

    appiumTest(
      'should successfully call eth_getBalance method and return balance',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withPopularNetworks().build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await MultichainTestDApp.setupAndNavigateToTestDapp(
              '?autoMode=true',
            );

            const networksToTest =
              MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
            await MultichainTestDApp.createSessionWithNetworks(networksToTest);

            const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
            const method = 'eth_getBalance';

            const invoked = await MultichainTestDApp.invokeMethodOnChain(
              chainId,
              method,
            );
            if (!invoked) {
              throw new Error(`Failed to invoke ${method} on chain ${chainId}`);
            }

            const resultText = await MultichainTestDApp.getInvokeMethodResult(
              chainId,
              method,
              0,
            );
            if (!resultText) {
              throw new Error(
                `Failed to get result for ${method} on chain ${chainId}`,
              );
            }

            if (!resultText.includes('"0x')) {
              throw new Error(
                `eth_getBalance returned invalid result. Expected hex string, got: ${resultText}`,
              );
            }
          },
        );
      },
    );

    appiumTest(
      'should successfully call eth_gasPrice method and return gas price',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withPopularNetworks().build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await MultichainTestDApp.setupAndNavigateToTestDapp(
              '?autoMode=true',
            );

            const networksToTest =
              MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
            await MultichainTestDApp.createSessionWithNetworks(networksToTest);

            const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
            const method = 'eth_gasPrice';

            const invoked = await MultichainTestDApp.invokeMethodOnChain(
              chainId,
              method,
            );
            if (!invoked) {
              throw new Error(`Failed to invoke ${method} on chain ${chainId}`);
            }

            const resultText = await MultichainTestDApp.getInvokeMethodResult(
              chainId,
              method,
              0,
            );
            if (!resultText) {
              throw new Error(
                `Failed to get result for ${method} on chain ${chainId}`,
              );
            }

            if (!resultText.includes('"0x')) {
              throw new Error(
                `eth_gasPrice returned invalid result. Expected hex string, got: ${resultText}`,
              );
            }
          },
        );
      },
    );
  });

  appiumTest.describe(
    'Write operations: transaction methods with confirmation dialogs',
    () => {
      appiumTest(
        'should trigger eth_sendTransaction confirmation dialog and reject transaction',
        async ({ driver: _driver, currentDeviceDetails }) => {
          await withFixtures(
            {
              fixture: createSessionFixture(),
              restartDevice: true,
              currentDeviceDetails,
            },
            async () => {
              await MultichainTestDApp.setupAndNavigateToTestDapp(
                '?autoMode=true',
              );

              const networksToTest =
                MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
              await MultichainTestDApp.createSessionWithNetworks(
                networksToTest,
              );

              const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
              const method = 'eth_sendTransaction';

              const invoked = await MultichainTestDApp.invokeMethodOnChain(
                chainId,
                method,
              );
              await Assertions.checkIfTextMatches(
                invoked ? 'true' : 'false',
                'true',
              );

              await MultichainTestDApp.tapCancelButton();
            },
          );
        },
      );

      appiumTest(
        'should verify transaction methods require confirmation',
        async ({ driver: _driver, currentDeviceDetails }) => {
          await withFixtures(
            {
              fixture: createSessionFixture(),
              restartDevice: true,
              currentDeviceDetails,
            },
            async () => {
              await MultichainTestDApp.setupAndNavigateToTestDapp(
                '?autoMode=true',
              );

              const networksToTest =
                MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
              await MultichainTestDApp.createSessionWithNetworks(
                networksToTest,
              );

              const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
              const writeOperations = ['eth_sendTransaction', 'personal_sign'];

              for (const method of writeOperations) {
                const invoked = await MultichainTestDApp.invokeMethodOnChain(
                  chainId,
                  method,
                );
                await Assertions.checkIfTextMatches(
                  invoked ? 'true' : 'false',
                  'true',
                );

                await MultichainTestDApp.tapCancelButton();
              }
            },
          );
        },
      );
    },
  );
});
