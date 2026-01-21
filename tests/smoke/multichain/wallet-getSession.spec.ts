/**
 * E2E tests for wallet_getSession API
 * Tests getting session information in different scenarios
 */
import { SmokeMultiChainAPI } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import MultichainTestDApp from '../../page-objects/Browser/MultichainTestDApp';
import MultichainUtilities from '../../utils/MultichainUtilities';
import { DappVariants } from '../../framework/Constants';

describe(SmokeMultiChainAPI('wallet_getSession'), () => {
  it('should successfully receive empty session scopes when there is no existing session', async () => {
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
        await MultichainTestDApp.setupAndNavigateToTestDapp();

        await MultichainTestDApp.scrollToPageTop();
        const connected = await MultichainTestDApp.useAutoConnectButton();
        if (!connected) {
          throw new Error('Failed to connect to dapp');
        }

        const sessionResult = await MultichainTestDApp.getSessionData();
        const assertions = MultichainUtilities.generateSessionAssertions(
          sessionResult,
          [],
        );

        if (!assertions.structureValid) {
          throw new Error('Invalid session structure');
        }

        // When there's no existing session, we expect to receive an empty session (success=false or chainCount=0)
        if (assertions.success && assertions.chainCount > 0) {
          throw new Error(
            `Expected empty session scopes, but found ${assertions.chainCount} chains`,
          );
        }

        if (
          sessionResult.sessionScopes &&
          Object.keys(sessionResult.sessionScopes).length > 0
        ) {
          throw new Error('Expected empty session scopes object');
        }
      },
    );
  });

  it('should successfully receive result that specifies its permitted session scopes for selected chains', async () => {
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
        await MultichainTestDApp.setupAndNavigateToTestDapp();
        const networksToTest =
          MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
        await MultichainTestDApp.createSessionWithNetworks(networksToTest);

        const sessionData = await MultichainTestDApp.getSessionData();
        const createAssertions = MultichainUtilities.generateSessionAssertions(
          sessionData,
          networksToTest,
        );

        if (!createAssertions.success) {
          throw new Error('Initial session creation failed');
        }

        const getSessionResult = await MultichainTestDApp.getSessionData();
        const getAssertions = MultichainUtilities.generateSessionAssertions(
          getSessionResult,
          networksToTest,
        );

        if (!getAssertions.structureValid) {
          throw new Error('Invalid session structure');
        }

        if (!getAssertions.success) {
          throw new Error('Failed to retrieve session data');
        }

        if (!getAssertions.chainsValid) {
          MultichainUtilities.logSessionDetails(
            getSessionResult,
            'Failed Session Validation',
          );
          throw new Error(
            `Chain validation failed. Missing chains: ${getAssertions.missingChains.join(
              ', ',
            )}`,
          );
        }

        if (getAssertions.chainCount !== networksToTest.length) {
          throw new Error(
            `Expected ${networksToTest.length} chains, but found ${getAssertions.chainCount}`,
          );
        }

        const expectedScope = MultichainUtilities.getEIP155Scope(
          MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
        );
        if (!getSessionResult.sessionScopes?.[expectedScope]) {
          throw new Error(`Expected session scope ${expectedScope} not found`);
        }

        const ethereumScope = getSessionResult.sessionScopes[expectedScope];
        if (!ethereumScope.accounts || ethereumScope.accounts.length === 0) {
          throw new Error('Expected session scope to have accounts');
        }
      },
    );
  });

  it('should return consistent session data across multiple getSession calls', async () => {
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
        await MultichainTestDApp.setupAndNavigateToTestDapp();
        const networksToTest =
          MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
        await MultichainTestDApp.createSessionWithNetworks(networksToTest);

        const sessionData = await MultichainTestDApp.getSessionData();
        const createAssertions = MultichainUtilities.generateSessionAssertions(
          sessionData,
          networksToTest,
        );

        if (!createAssertions.success) {
          throw new Error('Session creation failed');
        }

        const getSessionResult1 = await MultichainTestDApp.getSessionData();
        const getSessionResult2 = await MultichainTestDApp.getSessionData();
        const getSessionResult3 = await MultichainTestDApp.getSessionData();

        const assertions1 = MultichainUtilities.generateSessionAssertions(
          getSessionResult1,
          networksToTest,
        );
        const assertions2 = MultichainUtilities.generateSessionAssertions(
          getSessionResult2,
          networksToTest,
        );
        const assertions3 = MultichainUtilities.generateSessionAssertions(
          getSessionResult3,
          networksToTest,
        );

        if (
          !assertions1.success ||
          !assertions2.success ||
          !assertions3.success
        ) {
          throw new Error('One or more getSession calls failed');
        }

        const scopes1 = JSON.stringify(getSessionResult1.sessionScopes);
        const scopes2 = JSON.stringify(getSessionResult2.sessionScopes);
        const scopes3 = JSON.stringify(getSessionResult3.sessionScopes);

        if (scopes1 !== scopes2 || scopes2 !== scopes3) {
          throw new Error('Session data inconsistent across multiple calls');
        }

        const actualChains = assertions1.foundChains;
        console.log(
          `Session consistency test passed with ${
            actualChains.length
          } chains: ${actualChains.join(', ')}`,
        );
        if (actualChains.length === 0) {
          throw new Error('No chains found in session');
        }

        if (
          assertions1.chainCount !== assertions2.chainCount ||
          assertions2.chainCount !== assertions3.chainCount
        ) {
          throw new Error(
            `Chain count inconsistent: ${assertions1.chainCount}, ${assertions2.chainCount}, ${assertions3.chainCount}`,
          );
        }
      },
    );
  });

  it('should handle getSession after session has been modified', async () => {
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
        await MultichainTestDApp.setupAndNavigateToTestDapp();

        const initialNetworks =
          MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
        await MultichainTestDApp.createSessionWithNetworks(initialNetworks);

        const sessionData1 = await MultichainTestDApp.getSessionData();
        const createAssertions1 = MultichainUtilities.generateSessionAssertions(
          sessionData1,
          initialNetworks,
        );

        if (!createAssertions1.success) {
          throw new Error('Initial session creation failed');
        }

        const getSessionResult1 = await MultichainTestDApp.getSessionData();
        const getAssertions1 = MultichainUtilities.generateSessionAssertions(
          getSessionResult1,
          initialNetworks,
        );

        if (!getAssertions1.success || getAssertions1.chainCount === 0) {
          throw new Error('Initial session validation failed');
        }

        const initialChainCount = getAssertions1.chainCount;
        console.log(`Initial session has ${initialChainCount} chain(s)`);

        const newNetworks = [
          MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
          MultichainUtilities.CHAIN_IDS.BSC,
          MultichainUtilities.CHAIN_IDS.BASE,
        ];

        await MultichainTestDApp.createSessionWithNetworks(newNetworks);

        const getSessionResult2 = await MultichainTestDApp.getSessionData();
        const getAssertions2 = MultichainUtilities.generateSessionAssertions(
          getSessionResult2,
          newNetworks,
        );

        if (!getAssertions2.success) {
          throw new Error('New session creation failed');
        }

        if (!getAssertions2.chainsValid) {
          MultichainUtilities.logSessionDetails(
            getSessionResult2,
            'Failed Session Validation',
          );
          throw new Error(
            `Chain validation failed. Missing chains: ${getAssertions2.missingChains.join(
              ', ',
            )}`,
          );
        }

        console.log(
          `Modified session has ${
            getAssertions2.chainCount
          } chain(s): ${getAssertions2.foundChains.join(', ')}`,
        );
      },
    );
  });
});
