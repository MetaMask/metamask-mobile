/**
 * E2E tests for wallet_revokeSession API
 * Tests revoking sessions and verifying the session state afterwards
 */
import { SmokeMultiChainAPI } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import MultichainTestDApp from '../../page-objects/Browser/MultichainTestDApp';
import MultichainUtilities from '../../utils/MultichainUtilities';
import { DappVariants } from '../../framework/Constants';

describe(SmokeMultiChainAPI('wallet_revokeSession'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should return empty object from wallet_getSession call after revoking session', async () => {
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
        // Login and navigate to the test dapp
        await MultichainTestDApp.setupAndNavigateToTestDapp();

        // Create session - use single network for more reliable testing
        const networksToTest =
          MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
        await MultichainTestDApp.createSessionWithNetworks(networksToTest);

        // Verify session exists before revoke
        const sessionBeforeRevoke = await MultichainTestDApp.getSessionData();
        const assertionsBeforeRevoke =
          MultichainUtilities.generateSessionAssertions(
            sessionBeforeRevoke,
            networksToTest,
          );

        if (
          !assertionsBeforeRevoke.success ||
          assertionsBeforeRevoke.chainCount === 0
        ) {
          throw new Error('Session should have non-empty scopes before revoke');
        }

        // Revoke the session
        await MultichainTestDApp.tapRevokeSessionButton();

        // Get session data after revoke - should be empty
        const sessionAfterRevoke = await MultichainTestDApp.getSessionData();

        // Validate the session is now empty
        const assertionsAfterRevoke =
          MultichainUtilities.generateSessionAssertions(sessionAfterRevoke, []);

        if (!assertionsAfterRevoke.structureValid) {
          throw new Error('Invalid session structure after revoke');
        }

        // After revoke, we should either get success=false or success=true with empty scopes
        if (assertionsAfterRevoke.success) {
          // If successful, should have empty session scopes
          if (assertionsAfterRevoke.chainCount > 0) {
            MultichainUtilities.logSessionDetails(
              sessionAfterRevoke,
              'Unexpected Session After Revoke',
            );
            throw new Error(
              `Expected empty session scopes after revoke, but found ${assertionsAfterRevoke.chainCount} chains`,
            );
          }
        }

        // Verify sessionScopes is empty object
        if (
          sessionAfterRevoke.sessionScopes &&
          Object.keys(sessionAfterRevoke.sessionScopes).length > 0
        ) {
          throw new Error('Expected empty session scopes object after revoke');
        }
      },
    );
  });
});
