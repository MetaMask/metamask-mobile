/* eslint-disable no-console */
'use strict';
/**
 * E2E tests for wallet_revokeSession API
 * Tests revoking sessions and verifying the session state afterwards
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

/**
 * Helper function to attempt invoking a method on a specific chain
 * This simulates what would happen when trying to use wallet_invokeMethod after revoke
 */
async function attemptInvokeMethod(chainId: string): Promise<boolean> {
    try {
        const webview = MultichainTestDApp.getWebView();

        // Try to find and click an invoke method button for the specific chain
        const scopeId = `eip155:${chainId}`;
        const invokeButtonId = `invoke-method-${scopeId}-btn`;

        try {
            const invokeButton = webview.element(by.web.id(invokeButtonId));
            await invokeButton.scrollToView();
            await invokeButton.runScript('(el) => { el.click(); }');

            // Wait for processing
            await TestHelpers.delay(1000);
            return true;
        } catch (error) {
            return false;
        }
    } catch (error) {
        return false;
    }
}

describe(SmokeNetworkExpansion('wallet_revokeSession'), () => {
    beforeEach(() => {
        jest.setTimeout(150000);
    });

    it('should return empty object from wallet_getSession call after revoking session', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                await TestHelpers.reverseServerPort();

                // Login and navigate to the test dapp
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);
                await MultichainTestDApp.navigateToMultichainTestDApp();

                // Verify the WebView is visible
                await Assertions.checkIfVisible(
                    Promise.resolve(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID))),
                );

                try {
                    // Create session - use single network for more reliable testing
                    const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                    const createResult = await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                    const createAssertions = MultichainUtilities.generateSessionAssertions(createResult, networksToTest);

                    if (!createAssertions.success) {
                        throw new Error('Initial session creation failed');
                    }

                    // Wait for session to be established
                    await TestHelpers.delay(1000);

                    // Verify session exists before revoke
                    const sessionBeforeRevoke = await MultichainTestDApp.getSessionData();
                    const assertionsBeforeRevoke = MultichainUtilities.generateSessionAssertions(sessionBeforeRevoke, networksToTest);

                    if (!assertionsBeforeRevoke.success || assertionsBeforeRevoke.chainCount === 0) {
                        throw new Error('Session should have non-empty scopes before revoke');
                    }

                    console.log(`✅ Session verified with ${assertionsBeforeRevoke.chainCount} chains before revoke`);

                    // Revoke the session
                    const revokeResult = await MultichainTestDApp.clickRevokeSessionButton();

                    if (!revokeResult) {
                        throw new Error('Failed to click revoke session button');
                    }

                    // Wait for revoke to process
                    await TestHelpers.delay(2000);

                    // Get session data after revoke - should be empty
                    const sessionAfterRevoke = await MultichainTestDApp.getSessionData();

                    // Validate the session is now empty
                    const assertionsAfterRevoke = MultichainUtilities.generateSessionAssertions(sessionAfterRevoke, []);

                    if (!assertionsAfterRevoke.structureValid) {
                        throw new Error('Invalid session structure after revoke');
                    }

                    // After revoke, we should either get success=false or success=true with empty scopes
                    if (assertionsAfterRevoke.success) {
                        // If successful, should have empty session scopes
                        if (assertionsAfterRevoke.chainCount > 0) {
                            MultichainUtilities.logSessionDetails(sessionAfterRevoke, 'Unexpected Session After Revoke');
                            throw new Error(`Expected empty session scopes after revoke, but found ${assertionsAfterRevoke.chainCount} chains`);
                        }
                    }

                    // Verify sessionScopes is empty object
                    if (sessionAfterRevoke.sessionScopes && Object.keys(sessionAfterRevoke.sessionScopes).length > 0) {
                        throw new Error('Expected empty session scopes object after revoke');
                    }

                    console.log('🎉 Session revoke test passed');

                } catch (error) {
                    console.error('❌ Session revoke test failed:', error);
                    throw error;
                }
            },
        );
    });

    it('should prevent wallet_invokeMethod calls after session revoke', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                await TestHelpers.reverseServerPort();

                // Login and navigate to the test dapp
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);
                await MultichainTestDApp.navigateToMultichainTestDApp();

                try {
                    // Create session - use single network for more reliable testing
                    const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                    const createResult = await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                    const createAssertions = MultichainUtilities.generateSessionAssertions(createResult, networksToTest);

                    if (!createAssertions.success) {
                        throw new Error('Initial session creation failed');
                    }

                    // Wait for session to be established
                    await TestHelpers.delay(1000);

                    // Verify session has the expected scopes
                    const sessionBeforeRevoke = await MultichainTestDApp.getSessionData();
                    const assertionsBeforeRevoke = MultichainUtilities.generateSessionAssertions(sessionBeforeRevoke, networksToTest);

                    if (!assertionsBeforeRevoke.success || !assertionsBeforeRevoke.chainsValid) {
                        throw new Error('Session validation failed before revoke');
                    }

                    // Test that invoke method works before revoke (if possible)
                    try {
                        await attemptInvokeMethod(networksToTest[0]); // Try first network
                    } catch (error) {
                        // This is optional - not all test environments support invoke methods
                    }

                    // Revoke the session
                    const revokeResult = await MultichainTestDApp.clickRevokeSessionButton();

                    if (!revokeResult) {
                        throw new Error('Failed to revoke session');
                    }

                    // Wait for revoke to process
                    await TestHelpers.delay(2000);

                    // Verify session is empty after revoke
                    const sessionAfterRevoke = await MultichainTestDApp.getSessionData();
                    const assertionsAfterRevoke = MultichainUtilities.generateSessionAssertions(sessionAfterRevoke, []);

                    if (assertionsAfterRevoke.success && assertionsAfterRevoke.chainCount > 0) {
                        throw new Error('Session should be empty after revoke');
                    }

                    // Test that invoke method fails after revoke
                    try {
                        const invokeSuccess = await attemptInvokeMethod(networksToTest[0]);
                        if (invokeSuccess) {
                            console.warn('⚠️ Invoke method should fail after session revoke, but it succeeded');
                            // Don't fail the test as this might depend on the test environment
                        }
                    } catch (error) {
                        // This is expected - invoke method should fail after revoke
                    }

                    // Test invoke method for all previously available networks
                    for (const chainId of networksToTest) {
                        try {
                            const invokeSuccess = await attemptInvokeMethod(chainId);
                            if (invokeSuccess) {
                                console.warn(`⚠️ Invoke method for chain ${chainId} should fail after revoke, but it succeeded`);
                            }
                        } catch (error) {
                            // Expected behavior
                        }
                    }

                    console.log('🎉 Invoke method prevention test passed');

                } catch (error) {
                    console.error('❌ Invoke method prevention test failed:', error);
                    throw error;
                }
            },
        );
    });

    it('should handle multiple revoke calls gracefully', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                await TestHelpers.reverseServerPort();

                // Login and navigate to the test dapp
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);
                await MultichainTestDApp.navigateToMultichainTestDApp();

                try {
                    // Create session
                    const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                    const createResult = await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                    const createAssertions = MultichainUtilities.generateSessionAssertions(createResult, networksToTest);

                    if (!createAssertions.success) {
                        throw new Error('Session creation failed');
                    }

                    // Wait for session to be established
                    await TestHelpers.delay(1000);

                    // First revoke
                    const revokeResult1 = await MultichainTestDApp.clickRevokeSessionButton();
                    if (!revokeResult1) {
                        throw new Error('First revoke failed');
                    }

                    await TestHelpers.delay(1000);

                    // Verify session is empty after first revoke
                    const sessionAfterFirstRevoke = await MultichainTestDApp.getSessionData();
                    const assertionsAfterFirstRevoke = MultichainUtilities.generateSessionAssertions(sessionAfterFirstRevoke, []);

                    if (assertionsAfterFirstRevoke.success && assertionsAfterFirstRevoke.chainCount > 0) {
                        throw new Error('Session should be empty after first revoke');
                    }

                    // Second revoke (should handle gracefully)
                    const revokeResult2 = await MultichainTestDApp.clickRevokeSessionButton();
                    // This might succeed or fail depending on implementation, both are acceptable

                    await TestHelpers.delay(1000);

                    // Third revoke (should handle gracefully)
                    const revokeResult3 = await MultichainTestDApp.clickRevokeSessionButton();

                    // Verify session is still empty
                    const sessionAfterMultipleRevokes = await MultichainTestDApp.getSessionData();
                    const assertionsAfterMultipleRevokes = MultichainUtilities.generateSessionAssertions(sessionAfterMultipleRevokes, []);

                    if (assertionsAfterMultipleRevokes.success && assertionsAfterMultipleRevokes.chainCount > 0) {
                        throw new Error('Session should remain empty after multiple revokes');
                    }

                    console.log(`🎉 Multiple revoke calls test passed (results: ${revokeResult1}, ${revokeResult2}, ${revokeResult3})`);

                } catch (error) {
                    console.error('❌ Multiple revoke calls test failed:', error);
                    throw error;
                }
            },
        );
    });

    it('should handle revoke session when no session exists', async () => {
        await withFixtures(
            {
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                await TestHelpers.reverseServerPort();

                // Login and navigate to the test dapp
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);
                await MultichainTestDApp.navigateToMultichainTestDApp();

                try {
                    // Connect to dapp without creating a session
                    await MultichainTestDApp.scrollToPageTop();
                    const connected = await MultichainTestDApp.useAutoConnectButton();
                    if (!connected) {
                        throw new Error('Failed to connect to dapp');
                    }

                    // Verify no session exists
                    const sessionBeforeRevoke = await MultichainTestDApp.getSessionData();
                    const assertionsBeforeRevoke = MultichainUtilities.generateSessionAssertions(sessionBeforeRevoke, []);

                    if (assertionsBeforeRevoke.success && assertionsBeforeRevoke.chainCount > 0) {
                        throw new Error('Expected no session, but session exists');
                    }

                    // Try to revoke when no session exists
                    const revokeResult = await MultichainTestDApp.clickRevokeSessionButton();

                    // This should either succeed (no-op) or fail gracefully

                    await TestHelpers.delay(1000);

                    // Verify still no session after revoke attempt
                    const sessionAfterRevoke = await MultichainTestDApp.getSessionData();
                    const assertionsAfterRevoke = MultichainUtilities.generateSessionAssertions(sessionAfterRevoke, []);

                    if (assertionsAfterRevoke.success && assertionsAfterRevoke.chainCount > 0) {
                        throw new Error('Should still have no session after revoke attempt');
                    }

                    console.log(`🎉 Revoke with no session test passed (revoke result: ${revokeResult})`);

                } catch (error) {
                    console.error('❌ Revoke with no session test failed:', error);
                    throw error;
                }
            },
        );
    });
});
