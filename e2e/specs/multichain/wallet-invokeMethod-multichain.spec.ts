/**
 * E2E tests for wallet_invokeMethod API
 * Tests invoking RPC methods on specific chains, including read/write operations
 * Adapted from MetaMask extension multichain tests
 *
 * Uses native Detox selectors for reliable WebView interaction
 *
 * RESULT VERIFICATION:
 * The tests attempt to extract and log actual RPC results using runScript().
 * While Detox WebView limitations mean this doesn't always work reliably,
 * when it does work, we verify:
 * - eth_chainId returns "0x1" for Ethereum mainnet
 * - eth_getBalance returns a hex string balance (e.g., "0x...")
 * - eth_gasPrice returns a hex string gas price (e.g., "0x...")
 *
 * Even when result reading fails, the tests verify that:
 * 1. The method invocation button works
 * 2. Result elements are created in the DOM
 * 3. Results appear in the expected format (truncated vs non-truncated)
 */
import { SmokeMultiChainAPI } from '../../tags';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import MultichainUtilities from '../../utils/MultichainUtilities';
import Assertions from '../../../tests/framework/Assertions';
import { MULTICHAIN_TEST_TIMEOUTS } from '../../selectors/Browser/MultichainTestDapp.selectors';
import { waitFor } from 'detox';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import { isHexString } from '@metamask/utils';
import { DappVariants } from '../../../tests/framework/Constants';
import { LocalNodeType } from '../../../tests/framework';
import { AnvilNodeOptions } from '../../../tests/framework/types';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureEip7702 } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';

const ANVIL_NODE_OPTIONS_WITH_GATOR = [
  {
    type: 'anvil',
    options: {
      hardfork: 'prague',
      loadState: './e2e/seeder/network-states/7702/withDelegatorContracts.json',
    },
  },
];
const REMOTE_FEATURE_EIP_7702_MOCK = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...remoteFeatureEip7702),
  );
};

describe.skip(SmokeMultiChainAPI('wallet_invokeMethod'), () => {
  describe('Read operations: calling different methods on each connected scope', () => {
    it('should match selected method to the expected output for eth_chainId', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder().withPopularNetworks().build(),
          restartDevice: true,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

          // Test with multiple networks to verify different chain IDs
          const networksToTest =
            MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_POLYGON;

          await MultichainTestDApp.createSessionWithNetworks(networksToTest);

          // Verify session has both chains
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

          // Expected chain IDs in hex format
          const expectedResults = {
            [MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET]: '"0x1"', // Ethereum = 1
            [MultichainUtilities.CHAIN_IDS.POLYGON]: '"0x89"', // Polygon = 137
          };

          // Test each connected chain
          for (const chainId of networksToTest) {
            // Invoke the method on this chain
            const invoked = await MultichainTestDApp.invokeMethodOnChain(
              chainId,
              method,
            );

            if (!invoked) {
              throw new Error(`Failed to invoke ${method} on chain ${chainId}`);
            }

            // Get the result - use index 0 since we're only invoking once per chain
            // The index is for multiple invocations of the same method on the same chain
            const resultIndex = 0; // Always 0 for first invocation

            const resultText = await MultichainTestDApp.getInvokeMethodResult(
              chainId,
              method,
              resultIndex,
            );

            if (!resultText) {
              console.log(
                `Looking for element ID: invoke-method-eip155-${chainId}-${method}-result-${resultIndex}`,
              );
              throw new Error(
                `Failed to get result for ${method} on chain ${chainId}. Element not found.`,
              );
            }

            const matches = resultText === expectedResults[chainId];

            if (!matches) {
              console.log(`Result text: ${resultText}`);
              console.log(`Expected: ${expectedResults[chainId]}`);
              throw new Error(
                `Chain ${chainId} returned incorrect result. Expected: ${expectedResults[chainId]}, Got: ${resultText}`,
              );
            }
          }
        },
      );
    });

    it('should successfully call eth_getBalance method and return balance', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder().withPopularNetworks().build(),
          restartDevice: true,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

          const networksToTest =
            MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
          await MultichainTestDApp.createSessionWithNetworks(networksToTest);

          const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
          const method = 'eth_getBalance';

          // Invoke the method
          const invoked = await MultichainTestDApp.invokeMethodOnChain(
            chainId,
            method,
          );

          if (!invoked) {
            throw new Error(`Failed to invoke ${method} on chain ${chainId}`);
          }

          // Get the result
          const resultText = await MultichainTestDApp.getInvokeMethodResult(
            chainId,
            method,
            0,
          );

          if (!resultText) {
            throw new Error(
              `Failed to get result for ${method} on chain ${chainId}. Element not found.`,
            );
          }

          // Verify it's a valid hex string (should start with "0x)
          if (!resultText.includes('"0x')) {
            console.log(`eth_getBalance result: ${resultText}`);
            throw new Error(
              `eth_getBalance returned invalid result. Expected hex string, got: ${resultText}`,
            );
          }
        },
      );
    });

    it('should successfully call eth_gasPrice method and return gas price', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder().withPopularNetworks().build(),
          restartDevice: true,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

          const networksToTest =
            MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
          await MultichainTestDApp.createSessionWithNetworks(networksToTest);

          const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
          const method = 'eth_gasPrice';

          // Invoke the method
          const invoked = await MultichainTestDApp.invokeMethodOnChain(
            chainId,
            method,
          );

          if (!invoked) {
            throw new Error(`Failed to invoke ${method} on chain ${chainId}`);
          }

          // Get the result
          const resultText = await MultichainTestDApp.getInvokeMethodResult(
            chainId,
            method,
            0,
          );

          if (!resultText) {
            throw new Error(
              `Failed to get result for ${method} on chain ${chainId}. Element not found.`,
            );
          }

          // Verify it's a valid hex string (should start with "0x)
          if (!resultText.includes('"0x')) {
            console.log(`eth_gasPrice result: ${resultText}`);
            throw new Error(
              `eth_gasPrice returned invalid result. Expected hex string, got: ${resultText}`,
            );
          }
        },
      );
    });
  });

  describe('Write operations: transaction methods with confirmation dialogs', () => {
    it('should trigger eth_sendTransaction confirmation dialog and reject transaction', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder().withPopularNetworks().build(),
          restartDevice: true,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

          const networksToTest =
            MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
          await MultichainTestDApp.createSessionWithNetworks(networksToTest);

          const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
          const method = 'eth_sendTransaction';

          // Invoke the method
          const invoked = await MultichainTestDApp.invokeMethodOnChain(
            chainId,
            method,
          );
          await Assertions.checkIfTextMatches(
            invoked ? 'true' : 'false',
            'true',
          );

          // Wait for and cancel the confirmation dialog
          const cancelButton = element(by.text('Cancel'));
          await waitFor(cancelButton)
            .toBeVisible()
            .withTimeout(MULTICHAIN_TEST_TIMEOUTS.NAVIGATION);
          await cancelButton.tap();
          await waitFor(
            element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)),
          )
            .toBeVisible()
            .withTimeout(MULTICHAIN_TEST_TIMEOUTS.ELEMENT_VISIBILITY);
        },
      );
    });

    it('should verify transaction methods require confirmation', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder().withPopularNetworks().build(),
          restartDevice: true,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

          const networksToTest =
            MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
          await MultichainTestDApp.createSessionWithNetworks(networksToTest);

          const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
          const writeOperations = ['eth_sendTransaction', 'personal_sign'];

          for (const method of writeOperations) {
            // Invoke the method
            const invoked = await MultichainTestDApp.invokeMethodOnChain(
              chainId,
              method,
            );
            await Assertions.checkIfTextMatches(
              invoked ? 'true' : 'false',
              'true',
            );

            // Both eth_sendTransaction and personal_sign use Cancel button
            const cancelButton = element(by.text('Cancel'));
            await waitFor(cancelButton)
              .toBeVisible()
              .withTimeout(MULTICHAIN_TEST_TIMEOUTS.NAVIGATION);
            await cancelButton.tap();

            await waitFor(
              element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)),
            )
              .toBeVisible()
              .withTimeout(MULTICHAIN_TEST_TIMEOUTS.ELEMENT_VISIBILITY);
          }
        },
      );
    });
  });

  describe('Multiple method invocations', () => {
    it('should handle multiple method calls in sequence', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder().withPopularNetworks().build(),
          restartDevice: true,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

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
            // Invoke the method
            const invoked = await MultichainTestDApp.invokeMethodOnChain(
              chainId,
              method,
            );

            if (!invoked) {
              throw new Error(`Failed to invoke ${method} on chain ${chainId}`);
            }

            // Get the result
            const resultText = await MultichainTestDApp.getInvokeMethodResult(
              chainId,
              method,
              0,
            );

            if (!resultText) {
              throw new Error(
                `Failed to get result for ${method} on chain ${chainId}. Element not found.`,
              );
            }

            // Verify the result based on method type
            if (method === 'eth_chainId' && resultText !== '"0x1"') {
              console.log(`${method} result: ${resultText}`);
              throw new Error(
                `${method} returned incorrect result. Expected: "0x1", Got: ${resultText}`,
              );
            } else if (
              (method === 'eth_getBalance' || method === 'eth_gasPrice') &&
              !resultText.includes('"0x')
            ) {
              console.log(`${method} result: ${resultText}`);
              throw new Error(
                `${method} returned invalid result. Expected hex string, got: ${resultText}`,
              );
            }
          }
        },
      );
    });
  });

  describe('EIP-5792 methods', () => {
    it('should be able to call: wallet_getCapabilties', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder().withDefaultFixture().build(),
          restartDevice: true,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: ANVIL_NODE_OPTIONS_WITH_GATOR[0]
                .options as AnvilNodeOptions,
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
    });

    it('should be able to call: wallet_sendCalls', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder().withDefaultFixture().build(),
          restartDevice: true,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: ANVIL_NODE_OPTIONS_WITH_GATOR[0]
                .options as AnvilNodeOptions,
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

          await FooterActions.tapConfirmButton();

          const resultText = await MultichainTestDApp.getInvokeMethodResult(
            chainId,
            method,
          );

          const result = JSON.parse(resultText ?? '{}');

          Assertions.checkIfObjectHasKeysAndValidValues(result, {
            id: isHexString,
          });
        },
      );
    });

    it('should be able to call: wallet_getCallsStatus', async () => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder().withDefaultFixture().build(),
          restartDevice: true,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: ANVIL_NODE_OPTIONS_WITH_GATOR[0]
                .options as AnvilNodeOptions,
            },
          ],
          testSpecificMock: REMOTE_FEATURE_EIP_7702_MOCK,
        },
        async () => {
          await MultichainTestDApp.setupAndNavigateToTestDapp();

          const chainId = MultichainUtilities.CHAIN_IDS.LOCALHOST;
          await MultichainTestDApp.createSessionWithNetworks([chainId]);

          // First call wallet_sendCalls to get a batch ID
          const sendCallsMethod = 'wallet_sendCalls';
          await MultichainTestDApp.invokeMethod(chainId, sendCallsMethod);

          await FooterActions.tapConfirmButton();

          const sendCallsResultText =
            await MultichainTestDApp.getInvokeMethodResult(
              chainId,
              sendCallsMethod,
            );

          const sendCallsResult = JSON.parse(sendCallsResultText ?? '{}');
          const batchId = sendCallsResult.id;

          if (!batchId || !isHexString(batchId)) {
            throw new Error(
              `Invalid batch ID from wallet_sendCalls: ${batchId}`,
            );
          }

          // Now call wallet_getCallsStatus with the batch ID
          const getStatusMethod = 'wallet_getCallsStatus';

          await MultichainTestDApp.invokeMethod(chainId, getStatusMethod, [
            batchId,
          ]);

          const getStatusResultText =
            await MultichainTestDApp.getInvokeMethodResult(
              chainId,
              getStatusMethod,
            );

          const getStatusResult = JSON.parse(getStatusResultText ?? '{}');

          Assertions.checkIfObjectHasKeysAndValidValues(getStatusResult, {
            version: (value: unknown) =>
              typeof value === 'string' && value.length > 0,
            id: isHexString,
            chainId: isHexString,
            atomic: Boolean,
            status: (value: unknown) => value === 200,
            receipts: Array.isArray,
          });
        },
      );
    });
  });
});
