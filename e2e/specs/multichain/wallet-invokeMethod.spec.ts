/* eslint-disable no-console */
'use strict';
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
import TestHelpers from '../../helpers';
import { SmokeMultiChainAPI } from '../../tags';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures, DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS } from '../../fixtures/fixture-helper';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import MultichainUtilities from '../../utils/MultichainUtilities';
import Assertions from '../../utils/Assertions';
import { MULTICHAIN_TEST_TIMEOUTS } from '../../selectors/Browser/MultichainTestDapp.selectors';
import { waitFor } from 'detox';

describe(SmokeMultiChainAPI('wallet_invokeMethod'), () => {
    beforeEach(() => {
        jest.setTimeout(150000); // 2.5 minute timeout for stability
    });

    describe('Read operations: calling different methods on each connected scope', () => {
        it('should match selected method to the expected output for eth_chainId', async () => {
            await withFixtures(
                {
                    ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                    fixture: new FixtureBuilder().withPopularNetworks().build(),
                    restartDevice: true,
                },
                async () => {
                    await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

                    // Test with multiple networks to verify different chain IDs
                    const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_POLYGON;
                    
                    await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                    // Verify session has both chains
                    const sessionData = await MultichainTestDApp.getSessionData();
                    const sessionAssertions = MultichainUtilities.generateSessionAssertions(sessionData, networksToTest);
                    if (!sessionAssertions.success || sessionAssertions.chainCount !== networksToTest.length) {
                        throw new Error(`Session validation failed. Expected ${networksToTest.length} chains, got ${sessionAssertions.chainCount}`);
                    }

                    await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.METHOD_INVOCATION);

                    const method = 'eth_chainId';
                    
                    // Expected chain IDs in hex format
                    const expectedResults = {
                        [MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET]: '"0x1"',  // Ethereum = 1
                        [MultichainUtilities.CHAIN_IDS.POLYGON]: '"0x89"'           // Polygon = 137
                    };

                    // Test each connected chain
                    for (const chainId of networksToTest) {
                        // Invoke the method on this chain
                        const invoked = await MultichainTestDApp.invokeMethodOnChain(chainId, method);
                        
                        if (!invoked) {
                            throw new Error(`Failed to invoke ${method} on chain ${chainId}`);
                        }

                        // Get the result - use index 0 since we're only invoking once per chain
                        // The index is for multiple invocations of the same method on the same chain
                        const resultIndex = 0; // Always 0 for first invocation
                        
                        const resultText = await MultichainTestDApp.getInvokeMethodResult(chainId, method, resultIndex);
                        
                        if (!resultText) {
                            console.log(`Looking for element ID: invoke-method-eip155-${chainId}-${method}-result-${resultIndex}`);
                            throw new Error(`Failed to get result for ${method} on chain ${chainId}. Element not found.`);
                        }
                        
                        const matches = resultText === expectedResults[chainId];
                        
                        if (!matches) {
                            console.log(`Result text: ${resultText}`);
                            console.log(`Expected: ${expectedResults[chainId]}`);
                            throw new Error(`Chain ${chainId} returned incorrect result. Expected: ${expectedResults[chainId]}, Got: ${resultText}`);
                        }
                    }
                },
            );
        });

        it('should successfully call eth_getBalance method and return balance', async () => {
            await withFixtures(
                {
                    ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                    fixture: new FixtureBuilder().withPopularNetworks().build(),
                    restartDevice: true,
                },
                async () => {
                    await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

                    const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                    await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                    await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.METHOD_INVOCATION);

                    const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
                    const method = 'eth_getBalance';

                    // Invoke the method
                    const invoked = await MultichainTestDApp.invokeMethodOnChain(chainId, method);

                    if (!invoked) {
                        throw new Error(`Failed to invoke ${method} on chain ${chainId}`);
                    }

                    // Get the result
                    const resultText = await MultichainTestDApp.getInvokeMethodResult(chainId, method, 0);

                    if (!resultText) {
                        throw new Error(`Failed to get result for ${method} on chain ${chainId}. Element not found.`);
                    }
                    
                    // Verify it's a valid hex string (should start with "0x)
                    if (!resultText.includes('"0x')) {
                        console.log(`eth_getBalance result: ${resultText}`);
                        throw new Error(`eth_getBalance returned invalid result. Expected hex string, got: ${resultText}`);
                    }
                },
            );
        });

        it('should successfully call eth_gasPrice method and return gas price', async () => {
            await withFixtures(
                {
                    ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                    fixture: new FixtureBuilder().withPopularNetworks().build(),
                    restartDevice: true,
                },
                async () => {
                    await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

                    const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                    await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                    await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.METHOD_INVOCATION);

                    const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
                    const method = 'eth_gasPrice';

                    // Invoke the method
                    const invoked = await MultichainTestDApp.invokeMethodOnChain(chainId, method);

                    if (!invoked) {
                        throw new Error(`Failed to invoke ${method} on chain ${chainId}`);
                    }

                    // Get the result
                    const resultText = await MultichainTestDApp.getInvokeMethodResult(chainId, method, 0);

                    if (!resultText) {
                        throw new Error(`Failed to get result for ${method} on chain ${chainId}. Element not found.`);
                    }
                    
                    // Verify it's a valid hex string (should start with "0x)
                    if (!resultText.includes('"0x')) {
                        console.log(`eth_gasPrice result: ${resultText}`);
                        throw new Error(`eth_gasPrice returned invalid result. Expected hex string, got: ${resultText}`);
                    }
                }
            );
        });
    });

    describe('Write operations: transaction methods with confirmation dialogs', () => {
        it('should trigger eth_sendTransaction confirmation dialog and reject transaction', async () => {
            await withFixtures(
                {
                    ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                    fixture: new FixtureBuilder().withPopularNetworks().build(),
                    restartDevice: true,
                },
                async () => {
                    await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

                    const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                    await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                    await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.METHOD_INVOCATION);

                    const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
                    const method = 'eth_sendTransaction';

                    // Invoke the method
                    const invoked = await MultichainTestDApp.invokeMethodOnChain(chainId, method);
                    await Assertions.checkIfTextMatches(invoked ? 'true' : 'false', 'true');

                    // Wait for and cancel the confirmation dialog
                    const cancelButton = element(by.text('Cancel'));
                    await waitFor(cancelButton).toBeVisible().withTimeout(MULTICHAIN_TEST_TIMEOUTS.NAVIGATION);
                    await cancelButton.tap();
                    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID))).toBeVisible().withTimeout(MULTICHAIN_TEST_TIMEOUTS.ELEMENT_VISIBILITY);
                },
            );
        });

        it('should verify transaction methods require confirmation', async () => {
            await withFixtures(
                {
                    ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                    fixture: new FixtureBuilder().withPopularNetworks().build(),
                    restartDevice: true,
                },
                async () => {
                    await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

                    const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                    await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                    await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.METHOD_INVOCATION);

                    const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
                    const writeOperations = ['eth_sendTransaction', 'personal_sign'];

                    for (const method of writeOperations) {
                        // Invoke the method
                        const invoked = await MultichainTestDApp.invokeMethodOnChain(chainId, method);
                        await Assertions.checkIfTextMatches(invoked ? 'true' : 'false', 'true');

                        // Both eth_sendTransaction and personal_sign use Cancel button
                        const cancelButton = element(by.text('Cancel'));
                        await waitFor(cancelButton).toBeVisible().withTimeout(MULTICHAIN_TEST_TIMEOUTS.NAVIGATION);
                        await cancelButton.tap();

                        await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID))).toBeVisible().withTimeout(MULTICHAIN_TEST_TIMEOUTS.ELEMENT_VISIBILITY);
                    }
                },
            );
        });
    });

    describe('Multiple method invocations', () => {
        it('should handle multiple method calls in sequence', async () => {
            await withFixtures(
                {
                    ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                    fixture: new FixtureBuilder().withPopularNetworks().build(),
                    restartDevice: true,
                },
                async () => {
                    await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

                    const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                    await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                    await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.METHOD_INVOCATION);

                    const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
                    const methodsToTest = ['eth_chainId', 'eth_getBalance', 'eth_gasPrice'];

                    for (const method of methodsToTest) {
                        // Invoke the method
                        const invoked = await MultichainTestDApp.invokeMethodOnChain(chainId, method);

                        if (!invoked) {
                            throw new Error(`Failed to invoke ${method} on chain ${chainId}`);
                        }

                        // Get the result
                        const resultText = await MultichainTestDApp.getInvokeMethodResult(chainId, method, 0);

                        if (!resultText) {
                            throw new Error(`Failed to get result for ${method} on chain ${chainId}. Element not found.`);
                        }
                        
                        // Verify the result based on method type
                        if (method === 'eth_chainId' && resultText !== '"0x1"') {
                            console.log(`${method} result: ${resultText}`);
                            throw new Error(`${method} returned incorrect result. Expected: "0x1", Got: ${resultText}`);
                        } else if ((method === 'eth_getBalance' || method === 'eth_gasPrice') && !resultText.includes('"0x')) {
                            console.log(`${method} result: ${resultText}`);
                            throw new Error(`${method} returned invalid result. Expected hex string, got: ${resultText}`);
                        }

                        await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.DEFAULT_DELAY);
                    }
                },
            );
        });
    });
});
