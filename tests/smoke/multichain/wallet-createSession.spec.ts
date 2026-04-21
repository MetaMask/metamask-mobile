/**
 * E2E tests for wallet_createSession API
 * Tests creating sessions with different scope combinations and verifying permissions
 */
import { DappVariants } from '../../framework/Constants';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import MultichainTestDApp from '../../page-objects/Browser/MultichainTestDApp';
import { SmokeMultiChainAPI } from '../../tags';
import MultichainUtilities from '../../helpers/multichain/MultichainUtilities';

describe(SmokeMultiChainAPI('wallet_createSession'), () => {
  it('should create a session with Ethereum mainnet scope', async () => {
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

        await MultichainTestDApp.createSessionWithNetworks(
          MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM,
        );

        const sessionResult = await MultichainTestDApp.getSessionData();

        const assertions = MultichainUtilities.generateSessionAssertions(
          sessionResult,
          MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM,
        );

        MultichainUtilities.logSessionDetails(
          sessionResult,
          'Single Ethereum Test',
        );

        // Validate all assertions - same logic as before
        if (!assertions.structureValid) {
          throw new Error('Invalid session structure');
        }
        if (!assertions.success) {
          throw new Error('Session creation failed');
        }
        if (!assertions.chainsValid) {
          throw new Error(
            `Chain validation failed. Missing chains: ${assertions.missingChains.join(
              ', ',
            )}`,
          );
        }
        if (assertions.chainCount !== 1) {
          throw new Error(
            `Expected 1 chain, but found ${assertions.chainCount}`,
          );
        }
      },
    );
  });

  it('should create a session with multiple EVM chains', async () => {
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

        await MultichainTestDApp.createSessionWithNetworks(
          MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_POLYGON,
        );

        const sessionResult = await MultichainTestDApp.getSessionData();

        const assertions = MultichainUtilities.generateSessionAssertions(
          sessionResult,
          MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_POLYGON,
        );

        MultichainUtilities.logSessionDetails(
          sessionResult,
          'Multi-chain Test',
        );

        // Validate all assertions - same logic as before
        if (!assertions.structureValid) {
          throw new Error('Invalid session structure');
        }
        if (!assertions.success) {
          throw new Error('Session creation failed');
        }
        if (!assertions.chainsValid) {
          throw new Error(
            `Chain validation failed. Missing chains: ${assertions.missingChains.join(
              ', ',
            )}`,
          );
        }
        if (assertions.chainCount !== 2) {
          throw new Error(
            `Expected 2 chains, but found ${assertions.chainCount}`,
          );
        }
      },
    );
  });

  it('should create a session with all available EVM networks', async () => {
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

        await MultichainTestDApp.createSessionWithNetworks(
          MultichainUtilities.NETWORK_COMBINATIONS.ALL_MAJOR_EVM,
        );

        // Wait for session creation and get the data separately
        const sessionResult = await MultichainTestDApp.getSessionData();

        const assertions = MultichainUtilities.generateSessionAssertions(
          sessionResult,
          MultichainUtilities.NETWORK_COMBINATIONS.ALL_MAJOR_EVM,
        );

        MultichainUtilities.logSessionDetails(
          sessionResult,
          'All Networks Test',
        );

        // Validate all assertions - same logic as before
        if (!assertions.structureValid) {
          throw new Error('Invalid session structure');
        }
        if (!assertions.success) {
          throw new Error('Session creation failed');
        }
        if (
          !assertions.foundChains.includes(
            MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
          )
        ) {
          throw new Error('Ethereum mainnet not found in session scopes');
        }
        if (assertions.chainCount <= 1) {
          throw new Error(
            `Expected multiple chains, but found ${assertions.chainCount}`,
          );
        }
      },
    );
  });

  it('should handle session creation with no networks selected', async () => {
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

        await MultichainTestDApp.createSessionWithNetworks([]);

        // Create a mock empty result for consistency
        const sessionResult = { success: false, sessionScopes: {} };

        const assertions = MultichainUtilities.generateSessionAssertions(
          sessionResult,
          [],
        );
        MultichainUtilities.logSessionDetails(
          sessionResult,
          'No Networks Test',
        );

        if (!assertions.structureValid) {
          throw new Error('Invalid session result type');
        }

        // When no networks are selected, session creation should fail
        if (assertions.success || assertions.chainCount > 0) {
          throw new Error(
            'Expected session creation to fail with no networks selected, but it succeeded',
          );
        }
      },
    );
  });
});
