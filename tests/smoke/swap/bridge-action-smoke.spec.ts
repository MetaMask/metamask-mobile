import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import { loginToApp } from '../../flows/wallet.flow';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import QuoteView from '../../page-objects/swaps/QuoteView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import WalletView from '../../page-objects/wallet/WalletView';
import { SmokeTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment';
import { testSpecificMock } from '../../helpers/swap/bridge-mocks';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager, DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager';
import { setupSmartTransactionsMocks } from '../../helpers/swap/smart-transactions-mocks';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import { bridgeActionAnalyticsExpectations } from '../../helpers/analytics/expectations/bridge-action-smoke.analytics';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeTrade('Bridge functionality'), () => {
  jest.setTimeout(180000);

  it('should bridge ETH (Mainnet) to ETH (Base Network)', async () => {
    const destNetwork = 'Base';
    const quantity: string = '1';
    const sourceSymbol: string = 'ETH';
    const chainId = '0x1';
    const destChainId = '0x2105';
    const FIRST_ROW: number = 0;

    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withMetaMetricsOptIn()
            .withNetworkController({
              chainId,
              rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
              type: 'custom',
              nickname: 'Localhost',
              ticker: 'ETH',
            })
            .build();
        },
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: {
              chainId: 1,
            },
          },
        ],
        testSpecificMock: async (mockServer) => {
          await testSpecificMock(mockServer);
          await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
        },
        restartDevice: true,
        analyticsExpectations: bridgeActionAnalyticsExpectations,
      },
      async () => {
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
        await QuoteView.dismissKeypad();
        await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
          timeout: 60000,
          description: 'Network fee label visible',
        });
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
          ActivitiesView.transactionStatus(FIRST_ROW),
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
          {
            timeout: 120000,
            description: 'Bridge transaction should show Confirmed status',
          },
        );
      },
    );
  });
});
