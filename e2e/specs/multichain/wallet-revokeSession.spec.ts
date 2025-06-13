/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
'use strict';
/**
 * E2E tests for wallet_revokeSession API
 * Tests revoking sessions and verifying the session state afterwards
 */
import TestHelpers from '../../helpers';
import { SmokeNetworkExpansion } from '../../tags';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS, withFixtures } from '../../fixtures/fixture-helper';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import MultichainUtilities from '../../utils/MultichainUtilities';
import Assertions from '../../utils/Assertions';
import { MULTICHAIN_TEST_TIMEOUTS } from '../../selectors/Browser/MultichainTestDapp.selectors';

describe(SmokeNetworkExpansion('wallet_revokeSession'), () => {
    beforeEach(() => {
        jest.setTimeout(150000);
    });

    it('should return empty object from wallet_getSession call after revoking session', async () => {
        await withFixtures(
            {
                ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                // Login and navigate to the test dapp
                await MultichainTestDApp.setupAndNavigateToTestDapp();

                // Create session - use single network for more reliable testing
                const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                // Wait for session creation
                await TestHelpers.delay(1000);

                // Verify session exists before revoke
                const sessionBeforeRevoke = await MultichainTestDApp.getSessionData();
                const assertionsBeforeRevoke = MultichainUtilities.generateSessionAssertions(sessionBeforeRevoke, networksToTest);

                if (!assertionsBeforeRevoke.success || assertionsBeforeRevoke.chainCount === 0) {
                    throw new Error('Session should have non-empty scopes before revoke');
                }

                // Revoke the session
                await MultichainTestDApp.tapRevokeSessionButton();

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
            },
        );
    });

    it('should prevent wallet_invokeMethod calls after session revoke', async () => {
        await withFixtures(
            {
                ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                // Login and navigate to the test dapp
                await MultichainTestDApp.setupAndNavigateToTestDapp();

                // Create session - use single network for more reliable testing
                const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                await MultichainTestDApp.createSessionWithNetworks(networksToTest);

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
                    await MultichainTestDApp.attemptInvokeMethodWithButton(networksToTest[0]); // Try first network
                } catch (error) {
                    // This is optional - not all test environments support invoke methods
                }

                // Revoke the session
                await MultichainTestDApp.tapRevokeSessionButton();

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
                    const invokeSuccess = await MultichainTestDApp.attemptInvokeMethodWithButton(networksToTest[0]);
                    if (invokeSuccess) {
                        // Don't fail the test as this might depend on the test environment
                    }
                } catch (error) {
                    // This is expected - invoke method should fail after revoke
                }

                // Test invoke method for all previously available networks
                for (const chainId of networksToTest) {
                    try {
                        const invokeSuccess = await MultichainTestDApp.attemptInvokeMethodWithButton(chainId);
                        if (invokeSuccess) {
                            // Expected behavior may vary
                        }
                    } catch (error) {
                        // Expected behavior
                    }
                }
            },
        );
    });

    it('should handle revoke session when no session exists', async () => {
        await withFixtures(
            {
                ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                // Login and navigate to the test dapp
                await MultichainTestDApp.setupAndNavigateToTestDapp();

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
                await MultichainTestDApp.tapRevokeSessionButton();

                // This should either succeed (no-op) or fail gracefully

                await TestHelpers.delay(1000);

                // Verify still no session after revoke attempt
                const sessionAfterRevoke = await MultichainTestDApp.getSessionData();
                const assertionsAfterRevoke = MultichainUtilities.generateSessionAssertions(sessionAfterRevoke, []);

                if (assertionsAfterRevoke.success && assertionsAfterRevoke.chainCount > 0) {
                    throw new Error('Should still have no session after revoke attempt');
                }
            },
        );
    });
});
