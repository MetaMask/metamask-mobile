/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
'use strict';
/**
 * E2E tests for wallet_revokeSession API
 * Tests revoking sessions and verifying the session state afterwards
 */
import TestHelpers from '../../helpers';
import { SmokeMultiChainAPI } from '../../tags';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS, withFixtures } from '../../fixtures/fixture-helper';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import MultichainUtilities from '../../utils/MultichainUtilities';

describe(SmokeMultiChainAPI('wallet_revokeSession'), () => {
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
});
