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
import { LocalNodeType, AnvilNodeOptions } from '../../framework/types.js';
import { Hardfork } from '../../seeder/anvil-manager.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { remoteFeatureEip7702 } from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import { isHexString } from '@metamask/utils';

const ANVIL_NODE_OPTIONS_WITH_GATOR: AnvilNodeOptions = {
  hardfork: 'prague' as Hardfork,
  loadState: './tests/seeder/network-states/7702/withDelegatorContracts.json',
};

const REMOTE_FEATURE_EIP_7702_MOCK = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...remoteFeatureEip7702),
  );
};

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

  appiumTest.describe('Multiple method invocations', () => {
    appiumTest(
      'should handle multiple method calls in sequence',
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
            const methodsToTest = [
              'eth_chainId',
              'eth_getBalance',
              'eth_gasPrice',
            ];

            for (const method of methodsToTest) {
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

              if (method === 'eth_chainId' && resultText !== '"0x1"') {
                throw new Error(`${method}: expected "0x1", got ${resultText}`);
              } else if (
                (method === 'eth_getBalance' || method === 'eth_gasPrice') &&
                !resultText.includes('"0x')
              ) {
                throw new Error(
                  `${method}: expected hex string, got ${resultText}`,
                );
              }
            }
          },
        );
      },
    );
  });

  appiumTest.describe('EIP-5792 methods', () => {
    appiumTest(
      'should be able to call: wallet_getCapabilities',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withDefaultFixture().build(),
            restartDevice: true,
            currentDeviceDetails,
            localNodeOptions: [
              {
                type: LocalNodeType.anvil,
                options: ANVIL_NODE_OPTIONS_WITH_GATOR,
              },
            ],
            testSpecificMock: REMOTE_FEATURE_EIP_7702_MOCK,
          },
          async () => {
            await MultichainTestDApp.setupAndNavigateToTestDapp();

            const chainId = MultichainUtilities.CHAIN_IDS.LOCALHOST;
            await MultichainTestDApp.createSessionWithNetworks([chainId]);

            const method = 'wallet_getCapabilities';
            await MultichainTestDApp.invokeMethod(chainId, method);

            const resultText = await MultichainTestDApp.getInvokeMethodResult(
              chainId,
              method,
            );

            const result = JSON.parse(resultText ?? '{}');
            const expectedResult = {
              '0x539': {
                atomic: { status: 'ready' },
              },
            };

            await Assertions.checkIfObjectsMatch(result, expectedResult);
          },
        );
      },
    );

    appiumTest(
      'should be able to call: wallet_sendCalls',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withDefaultFixture().build(),
            restartDevice: true,
            currentDeviceDetails,
            localNodeOptions: [
              {
                type: LocalNodeType.anvil,
                options: ANVIL_NODE_OPTIONS_WITH_GATOR,
              },
            ],
            testSpecificMock: REMOTE_FEATURE_EIP_7702_MOCK,
          },
          async () => {
            await MultichainTestDApp.setupAndNavigateToTestDapp();

            const chainId = MultichainUtilities.CHAIN_IDS.LOCALHOST;
            await MultichainTestDApp.createSessionWithNetworks([chainId]);

            const method = 'wallet_sendCalls';
            await MultichainTestDApp.invokeMethod(chainId, method);

            await MultichainTestDApp.tapConfirmButton();

            const resultText = await MultichainTestDApp.getInvokeMethodResult(
              chainId,
              method,
            );

            const result = JSON.parse(resultText ?? '{}') as Record<
              string,
              unknown
            >;

            await Assertions.checkIfObjectHasKeysAndValidValues(result, {
              id: isHexString,
            });
          },
        );
      },
    );

    appiumTest(
      'should be able to call: wallet_getCallsStatus',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withDefaultFixture().build(),
            restartDevice: true,
            currentDeviceDetails,
            localNodeOptions: [
              {
                type: LocalNodeType.anvil,
                options: ANVIL_NODE_OPTIONS_WITH_GATOR,
              },
            ],
            testSpecificMock: REMOTE_FEATURE_EIP_7702_MOCK,
          },
          async () => {
            await MultichainTestDApp.setupAndNavigateToTestDapp();

            const chainId = MultichainUtilities.CHAIN_IDS.LOCALHOST;
            await MultichainTestDApp.createSessionWithNetworks([chainId]);

            // First obtain a batch ID from wallet_sendCalls
            const sendCallsMethod = 'wallet_sendCalls';
            await MultichainTestDApp.invokeMethod(chainId, sendCallsMethod);
            await MultichainTestDApp.tapConfirmButton();

            const sendCallsResultText =
              await MultichainTestDApp.getInvokeMethodResult(
                chainId,
                sendCallsMethod,
              );

            const sendCallsResult = JSON.parse(
              sendCallsResultText ?? '{}',
            ) as Record<string, unknown>;
            const batchId = sendCallsResult.id as string;

            if (!batchId || !isHexString(batchId)) {
              throw new Error(
                `Invalid batch ID from wallet_sendCalls: ${batchId}`,
              );
            }

            // Call wallet_getCallsStatus with the obtained batch ID
            const getStatusMethod = 'wallet_getCallsStatus';
            await MultichainTestDApp.invokeMethod(chainId, getStatusMethod, [
              batchId,
            ]);

            const getStatusResultText =
              await MultichainTestDApp.getInvokeMethodResult(
                chainId,
                getStatusMethod,
              );

            const getStatusResult = JSON.parse(
              getStatusResultText ?? '{}',
            ) as Record<string, unknown>;

            await Assertions.checkIfObjectHasKeysAndValidValues(
              getStatusResult,
              {
                version: (value: unknown) =>
                  typeof value === 'string' && value.length > 0,
                id: isHexString,
                chainId: isHexString,
                atomic: Boolean,
                status: (value: unknown) => value === 200,
                receipts: Array.isArray,
              },
            );
          },
        );
      },
    );
  });
});
