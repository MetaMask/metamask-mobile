import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import { loginToApp } from '../../flows/wallet.flow';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import QuoteView from '../../page-objects/swaps/QuoteView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import WalletView from '../../page-objects/wallet/WalletView';
import { SmokeSwap } from '../../tags';
import Assertions from '../../framework/Assertions';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment';
import {
  testSpecificMock,
  createBridgeQuoteStatusManagerMock,
} from '../../helpers/swap/bridge-mocks';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager, DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager';
import { setupSmartTransactionsMocks } from '../../helpers/swap/smart-transactions-mocks';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import { bridgeActionAnalyticsExpectations } from '../../helpers/analytics/expectations/bridge-action-smoke.analytics';
import { collectSeenProxiedRequests } from '../../api-mocking/helpers/mockHelpers';

/**
 * Runs the ETH (Mainnet) -> ETH (Base) bridge flow used by the tests in this
 * file, from opening the swap screen through the transaction showing as
 * Confirmed in the activity list.
 */
async function runEthToBaseBridgeFlow(destNetwork: string) {
  const quantity = '1';
  const sourceSymbol = 'ETH';
  const destChainId = '0x2105';
  // Row 0 is a stale STX-shaped entry; the confirmed bridge tx is on row 1.
  // TODO: stop merging SmartTransactionsController state into
  // selectLocalTransactions / selectSortedTransactions, then assert row 0.
  const BRIDGE_ROW = 1;

  await loginToApp();
  await prepareSwapsTestEnvironment();

  await TabBarComponent.tapWallet();
  await WalletView.tapWalletSwapButton();
  await device.disableSynchronization();
  await QuoteView.tapDestinationToken();
  await Assertions.expectElementToBeVisible(QuoteView.searchToken, {
    timeout: 15000,
    description: 'Token search input visible in destination token picker',
  });
  await QuoteView.selectNetwork(destNetwork);
  await QuoteView.tapToken(destChainId, sourceSymbol);
  // Open keypad by tapping source amount input (keypad is in BottomSheet, closed after token selection)
  await QuoteView.tapSourceAmountInput();
  await QuoteView.enterAmount(quantity);
  await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
    timeout: 60000,
    description: 'Network fee label visible',
  });
  await QuoteView.dismissKeypad();
  await Assertions.expectElementToBeVisible(QuoteView.confirmBridge, {
    description: 'Confirm bridge button visible',
  });

  await QuoteView.tapConfirmBridge();

  await Assertions.expectElementToBeVisible(ActivitiesView.title, {
    timeout: 30000,
    description: 'Activity title visible after bridge submission',
  });
  await Assertions.expectElementToBeVisible(
    ActivitiesView.bridgeActivityTitle(destNetwork),
    {
      description: 'Bridge activity for destination network visible',
    },
  );

  await Assertions.expectElementToHaveText(
    ActivitiesView.transactionStatus(BRIDGE_ROW),
    ActivitiesViewSelectorsText.CONFIRM_TEXT,
    {
      timeout: 120000,
      description: 'Bridge transaction should show Confirmed status',
    },
  );
}

/** Fixture builder shared by the bridge tests in this file: ETH on a local Anvil "Mainnet". */
function buildEthMainnetFixture({ localNodes }: { localNodes?: LocalNode[] }) {
  const node = localNodes?.[0] as unknown as AnvilManager;
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  return new FixtureBuilder()
    .withMetaMetricsOptIn()
    .withNetworkController({
      chainId: '0x1',
      rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
      type: 'custom',
      nickname: 'Localhost',
      ticker: 'ETH',
    })
    .build();
}

const ANVIL_MAINNET_LOCAL_NODE_OPTIONS = [
  {
    type: LocalNodeType.anvil,
    options: {
      chainId: 1,
    },
  },
];

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeSwap('Bridge functionality'), () => {
  jest.setTimeout(180000);

  it('should bridge ETH (Mainnet) to ETH (Base Network)', async () => {
    await withFixtures(
      {
        fixture: buildEthMainnetFixture,
        localNodeOptions: ANVIL_MAINNET_LOCAL_NODE_OPTIONS,
        testSpecificMock: async (mockServer) => {
          await testSpecificMock(mockServer);
          await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
        },
        restartDevice: true,
        analyticsExpectations: bridgeActionAnalyticsExpectations,
      },
      async () => {
        await runEthToBaseBridgeFlow('Base');
      },
    );
  });

  describe('bridgeQuoteStatusManager', () => {
    it('fetches bridge status via getQuoteStatus instead of getTxStatus when the flag is enabled and the quote has a quoteId', async () => {
      await withFixtures(
        {
          fixture: buildEthMainnetFixture,
          localNodeOptions: ANVIL_MAINNET_LOCAL_NODE_OPTIONS,
          testSpecificMock: async (mockServer) => {
            await createBridgeQuoteStatusManagerMock()(mockServer);
            await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
          },
          restartDevice: true,
        },
        async ({ mockServer }) => {
          if (!mockServer) {
            throw new Error(
              'Mock server is not defined, check testSpecificMock setup',
            );
          }

          await runEthToBaseBridgeFlow('Base');

          const seen = await collectSeenProxiedRequests(mockServer);
          const getQuoteStatusRequests = seen.filter((request) =>
            request.proxiedUrl.includes('getQuoteStatus'),
          );
          const getTxStatusRequests = seen.filter((request) =>
            request.proxiedUrl.includes('getTxStatus'),
          );

          expect(getQuoteStatusRequests.length).toBeGreaterThan(0);
          expect(getTxStatusRequests.length).toBe(0);
        },
      );
    });

    it('falls back to getTxStatus when getQuoteStatus has no submitted status yet', async () => {
      await withFixtures(
        {
          fixture: buildEthMainnetFixture,
          localNodeOptions: ANVIL_MAINNET_LOCAL_NODE_OPTIONS,
          testSpecificMock: async (mockServer) => {
            await createBridgeQuoteStatusManagerMock({})(mockServer);
            await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
          },
          restartDevice: true,
        },
        async ({ mockServer }) => {
          if (!mockServer) {
            throw new Error(
              'Mock server is not defined, check testSpecificMock setup',
            );
          }

          await runEthToBaseBridgeFlow('Base');

          const seen = await collectSeenProxiedRequests(mockServer);
          const getQuoteStatusRequests = seen.filter((request) =>
            request.proxiedUrl.includes('getQuoteStatus'),
          );
          const getTxStatusRequests = seen.filter((request) =>
            request.proxiedUrl.includes('getTxStatus'),
          );

          expect(getQuoteStatusRequests.length).toBeGreaterThan(0);
          expect(getTxStatusRequests.length).toBeGreaterThan(0);
        },
      );
    });
  });
});
