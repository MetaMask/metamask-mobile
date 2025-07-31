/**
 * E2E tests for wallet_sessionChanged API
 * Tests that sessionChanged event is fired when networks are added to the session
 */
import { SmokeMultiChainAPI } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import MultichainUtilities from '../../utils/MultichainUtilities';
import Assertions from '../../framework/Assertions';
import { DappVariants } from '../../framework/Constants';

describe(SmokeMultiChainAPI('wallet_sessionChanged'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should receive a wallet_sessionChanged event when creating a new session with different networks', async () => {
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

        // Create initial session with Ethereum and Polygon
        const initialNetworks = [
          MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
          MultichainUtilities.CHAIN_IDS.POLYGON,
        ];
        await MultichainTestDApp.createSessionWithNetworks(initialNetworks);

        // Add Base network to the session
        const modifiedNetworks = [
          MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
          MultichainUtilities.CHAIN_IDS.BASE,
        ];

        await MultichainTestDApp.createSessionWithNetworks(modifiedNetworks);

        // Check the most recent sessionChanged event at index 0
        const baseScope = MultichainUtilities.getEIP155Scope(
          MultichainUtilities.CHAIN_IDS.BASE,
        );

        const eventText = await MultichainTestDApp.getSessionChangedEventData(
          0,
        );

        // Verify event text exists
        await Assertions.checkIfValueIsDefined(eventText);

        if (!eventText) {
          throw new Error('Event text is null or empty');
        }

        const parsedEvent = JSON.parse(eventText);
        const eventScopes = Object.keys(
          parsedEvent.params?.sessionScopes || {},
        );

        // Verify Base network is included in the event
        const baseScopeIncluded = eventScopes.includes(baseScope);
        await Assertions.checkIfTextMatches(
          baseScopeIncluded ? 'true' : 'false',
          'true',
        );

        console.log(
          '✅ wallet_sessionChanged test passed - event triggered correctly',
        );
      },
    );
  });
});
