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

appiumTest.describe(SmokeMultiChainAPI('wallet_invokeMethod_eip5792'), () => {
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

            // Poll wallet_getCallsStatus until the transaction is confirmed
            // (status 200 + receipts). Anvil mines asynchronously so the
            // first call may return status 100 (pending) with no receipts.
            const getStatusMethod = 'wallet_getCallsStatus';
            const POLL_DEADLINE_MS = 30_000;
            const deadline = Date.now() + POLL_DEADLINE_MS;
            let resultIndex = 0;
            let getStatusResult: Record<string, unknown> = {};

            for (;;) {
              await MultichainTestDApp.invokeMethod(chainId, getStatusMethod, [
                batchId,
              ]);
              const text = await MultichainTestDApp.getInvokeMethodResult(
                chainId,
                getStatusMethod,
                resultIndex,
              );
              resultIndex += 1;
              getStatusResult = JSON.parse(text ?? '{}') as Record<
                string,
                unknown
              >;

              if (getStatusResult.status === 200 || Date.now() >= deadline) {
                break;
              }
              await new Promise<void>((r) => setTimeout(r, 500));
            }

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
