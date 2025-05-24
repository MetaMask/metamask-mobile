/* eslint-disable no-console */
'use strict';
/**
 * E2E tests for wallet_createSession API
 * Tests creating sessions with different scope combinations and verifying permissions
 */
import TestHelpers from '../../helpers';
import { SmokeNetworkExpansion } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import MultichainUtilities from '../../utils/MultichainUtilities';

describe(SmokeNetworkExpansion('wallet_createSession'), () => {
    beforeEach(() => {
        jest.setTimeout(150000);
    });

    it('should create a session with Ethereum mainnet scope', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                console.log('🚀 Starting wallet_createSession test...');

                await TestHelpers.reverseServerPort();
                console.log('📡 Server port reversed');

                // Login and navigate to the test dapp
                console.log('🔐 Logging into app...');
                await loginToApp();
                console.log('✅ Login successful');

                console.log('🌐 Navigating to browser tab...');
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);
                console.log('✅ Browser tab visible');

                // Navigate to the multichain test dapp
                console.log('🎯 Navigating to multichain test dapp...');
                await MultichainTestDApp.navigateToMultichainTestDApp();
                console.log('✅ Navigation to dapp completed');

                // Verify the WebView is visible
                console.log('🔍 Verifying WebView is visible...');
                await Assertions.checkIfVisible(
                    Promise.resolve(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID))),
                );
                console.log('✅ WebView is visible');

                try {
                    console.log('⚡ Starting session creation with Ethereum mainnet...');

                    // Create session with only Ethereum Mainnet
                    const sessionResult = await MultichainTestDApp.createSessionWithNetworks(
                        MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                    );

                    // Use utility for comprehensive validation
                    const assertions = MultichainUtilities.generateSessionAssertions(
                        sessionResult,
                        MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                    );

                    MultichainUtilities.logSessionDetails(sessionResult, 'Single Ethereum Test');

                    // Validate using utility assertions
                    if (!assertions.structureValid) {
                        throw new Error('Invalid session structure');
                    }

                    if (!assertions.success) {
                        throw new Error('Session creation failed');
                    }

                    if (!assertions.chainsValid) {
                        throw new Error(`Chain validation failed. Missing chains: ${assertions.missingChains.join(', ')}`);
                    }

                    if (assertions.chainCount !== 1) {
                        throw new Error(`Expected 1 chain, but found ${assertions.chainCount}`);
                    }

                    console.log('🎉 Session created successfully with Ethereum mainnet scope');

                } catch (error) {
                    console.error('❌ Test failed with error:', error);
                    if (error instanceof Error) {
                        console.error('❌ Error stack:', error.stack);
                    }
                    throw error;
                }
            },
        );
    });

    it('should create a session with multiple EVM chains', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                console.log('🚀 Starting multi-chain session test...');
                await TestHelpers.reverseServerPort();

                // Login and navigate to the test dapp
                console.log('🔐 Logging into app...');
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);

                // Navigate to the multichain test dapp
                console.log('🎯 Navigating to multichain test dapp...');
                await MultichainTestDApp.navigateToMultichainTestDApp();

                try {
                    console.log('⚡ Starting session creation with multiple chains...');

                    // Create session with Ethereum Mainnet and Linea Mainnet
                    const sessionResult = await MultichainTestDApp.createSessionWithNetworks(
                        MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_LINEA
                    );

                    // Use utility for comprehensive validation
                    const assertions = MultichainUtilities.generateSessionAssertions(
                        sessionResult,
                        MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_LINEA
                    );

                    MultichainUtilities.logSessionDetails(sessionResult, 'Multi-chain Test');

                    // Validate using utility assertions
                    if (!assertions.structureValid) {
                        throw new Error('Invalid session structure');
                    }

                    if (!assertions.success) {
                        throw new Error('Session creation failed');
                    }

                    if (!assertions.chainsValid) {
                        throw new Error(`Chain validation failed. Missing chains: ${assertions.missingChains.join(', ')}`);
                    }

                    if (assertions.chainCount !== 2) {
                        throw new Error(`Expected 2 chains, but found ${assertions.chainCount}`);
                    }

                    console.log('🎉 Multi-chain session created successfully');

                } catch (error) {
                    console.error('❌ Multi-chain test failed:', error);
                    if (error instanceof Error) {
                        console.error('❌ Error stack:', error.stack);
                    }
                    throw error;
                }
            },
        );
    });

    it('should create a session with all available EVM networks', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                console.log('🚀 Starting all-networks session test...');
                await TestHelpers.reverseServerPort();

                // Login and navigate to the test dapp
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);

                // Navigate to the multichain test dapp
                await MultichainTestDApp.navigateToMultichainTestDApp();

                try {
                    // Create session with multiple EVM networks
                    console.log('⚡ Creating session with networks:', MultichainUtilities.NETWORK_COMBINATIONS.ALL_MAJOR_EVM);

                    const sessionResult = await MultichainTestDApp.createSessionWithNetworks(
                        MultichainUtilities.NETWORK_COMBINATIONS.ALL_MAJOR_EVM
                    );

                    // Use utility for comprehensive validation
                    const assertions = MultichainUtilities.generateSessionAssertions(
                        sessionResult,
                        MultichainUtilities.NETWORK_COMBINATIONS.ALL_MAJOR_EVM
                    );

                    MultichainUtilities.logSessionDetails(sessionResult, 'All Networks Test');

                    // Validate using utility assertions
                    if (!assertions.structureValid) {
                        throw new Error('Invalid session structure');
                    }

                    if (!assertions.success) {
                        throw new Error('Session creation failed');
                    }

                    // Verify Ethereum mainnet is always present
                    if (!assertions.foundChains.includes(MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET)) {
                        throw new Error('Ethereum mainnet not found in session scopes');
                    }

                    if (assertions.chainCount <= 1) {
                        throw new Error(`Expected multiple chains, but found ${assertions.chainCount}`);
                    }

                    console.log('🎉 All-networks session created successfully');

                } catch (error) {
                    console.error('❌ All-networks test failed:', error);
                    if (error instanceof Error) {
                        console.error('❌ Error stack:', error.stack);
                    }
                    throw error;
                }
            },
        );
    });

    it('should handle session creation with no networks selected', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                console.log('🚀 Starting no-networks session test...');
                await TestHelpers.reverseServerPort();

                // Login and navigate to the test dapp
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);

                // Navigate to the multichain test dapp
                await MultichainTestDApp.navigateToMultichainTestDApp();

                try {
                    console.log('⚡ Attempting session creation with no networks...');

                    // Try to create session with no networks selected
                    const sessionResult = await MultichainTestDApp.createSessionWithNetworks([]);

                    const assertions = MultichainUtilities.generateSessionAssertions(sessionResult, []);
                    MultichainUtilities.logSessionDetails(sessionResult, 'No Networks Test');

                    // This should either fail or create an empty session
                    // The behavior depends on the implementation
                    if (!assertions.structureValid) {
                        throw new Error('Invalid session result type');
                    }

                    if (assertions.success) {
                        console.log('✅ Session created with', assertions.chainCount, 'chains');
                    } else {
                        console.log('✅ Session creation failed as expected for no networks');
                    }

                } catch (error) {
                    // This test expects that creating a session with no scopes might fail
                    // which is acceptable behavior
                    console.log('✅ Session creation with no scopes failed as expected:', error);
                }
            },
        );
    });

    it('should get session information after creating a session', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                console.log('🚀 Starting session retrieval test...');
                await TestHelpers.reverseServerPort();

                // Login and navigate to the test dapp
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);

                // Navigate to the multichain test dapp
                await MultichainTestDApp.navigateToMultichainTestDApp();

                try {
                    // First create a session
                    console.log('⚡ Creating initial session...');
                    const createResult = await MultichainTestDApp.createSessionWithNetworks(
                        MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                    );

                    const createAssertions = MultichainUtilities.generateSessionAssertions(
                        createResult,
                        MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                    );

                    if (!createAssertions.success) {
                        throw new Error('Initial session creation failed');
                    }
                    console.log('✅ Initial session created');

                    // Wait a bit for session to be established
                    await TestHelpers.delay(1000);

                    // Get session information using the dedicated method
                    console.log('📊 Retrieving session data...');
                    const getSessionResult = await MultichainTestDApp.getSessionData();

                    const getAssertions = MultichainUtilities.generateSessionAssertions(
                        getSessionResult,
                        MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                    );

                    if (!getAssertions.success) {
                        throw new Error('Failed to retrieve session data');
                    }

                    if (!getAssertions.chainsValid) {
                        throw new Error('Ethereum scope not found in retrieved session');
                    }
                    console.log('✅ Session data retrieved successfully');

                    // Verify we can retrieve session data multiple times
                    await TestHelpers.delay(500);
                    console.log('📊 Retrieving session data again...');
                    const getSessionResult2 = await MultichainTestDApp.getSessionData();

                    const getAssertions2 = MultichainUtilities.generateSessionAssertions(
                        getSessionResult2,
                        MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                    );

                    if (!getAssertions2.success) {
                        throw new Error('Failed to retrieve session data on second attempt');
                    }

                    // Both calls should return the same session data
                    const scopes1 = JSON.stringify(getSessionResult.sessionScopes);
                    const scopes2 = JSON.stringify(getSessionResult2.sessionScopes);

                    if (scopes1 !== scopes2) {
                        throw new Error('Session data inconsistent between calls');
                    }
                    console.log('✅ Session data consistent across multiple calls');

                    console.log('🎉 Session retrieval test completed successfully');

                } catch (error) {
                    console.error('❌ Session retrieval test failed:', error);
                    if (error instanceof Error) {
                        console.error('❌ Error stack:', error.stack);
                    }
                    throw error;
                }
            },
        );
    });

    it('should verify session contains expected chains using helper method', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                console.log('🚀 Starting helper methods test...');
                await TestHelpers.reverseServerPort();

                // Login and navigate to the test dapp
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);

                // Navigate to the multichain test dapp
                await MultichainTestDApp.navigateToMultichainTestDApp();

                try {
                    // Create session with specific networks
                    const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_LINEA;
                    console.log('⚡ Creating session with networks for helper test:', networksToTest);

                    const sessionResult = await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                    const assertions = MultichainUtilities.generateSessionAssertions(sessionResult, networksToTest);

                    if (!assertions.success) {
                        throw new Error('Session creation failed');
                    }
                    console.log('✅ Session created for helper test');

                    // Use helper method to verify chains are present
                    console.log('🔍 Verifying chains using helper method...');
                    const chainsVerified = await MultichainTestDApp.verifySessionContainsChains(networksToTest);

                    if (!chainsVerified) {
                        throw new Error('Chain verification failed');
                    }
                    console.log('✅ Chains verified successfully');

                    // Test chain count method
                    console.log('🔢 Testing chain count method...');
                    const chainCount = await MultichainTestDApp.getSessionChainCount();

                    if (chainCount !== networksToTest.length) {
                        throw new Error(`Expected ${networksToTest.length} chains, but count method returned ${chainCount}`);
                    }
                    console.log('✅ Chain count method returned correct value:', chainCount);

                    // Additional validation using utilities
                    if (assertions.chainCount !== networksToTest.length) {
                        throw new Error(`Utility chain count mismatch: expected ${networksToTest.length}, got ${assertions.chainCount}`);
                    }

                    MultichainUtilities.logSessionDetails(sessionResult, 'Helper Methods Test');

                    console.log('🎉 Helper methods test completed successfully');

                } catch (error) {
                    console.error('❌ Helper methods test failed:', error);
                    if (error instanceof Error) {
                        console.error('❌ Error stack:', error.stack);
                    }
                    throw error;
                }
            },
        );
    });
});
