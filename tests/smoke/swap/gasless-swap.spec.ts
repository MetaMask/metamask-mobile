import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Assertions from '../../framework/Assertions';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import { SmokeTrade } from '../../../e2e/tags';
import { loginToApp } from '../../../e2e/viewHelper';
import { logger } from '../../framework/logger';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';
import QuoteView from '../../../e2e/pages/swaps/QuoteView';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { GASLESS_SWAP_QUOTES_ETH_MUSD } from '../../helpers/swap/constants';

describe(SmokeTrade('Gasless Swap - '), (): void => {
  const chainId = '0x1';

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(120000);
  });

  it('displays included label for gasless ETH to MUSD swap quote', async (): Promise<void> => {
    await withFixtures(
      {
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId,
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Localhost',
                ticker: 'ETH',
              },
            })
            .withMetaMetricsOptIn()
            .withPreferencesController({
              smartTransactionsOptInStatus: true,
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
          // Mock ETH->MUSD quote (gasless swap)
          await setupMockRequest(mockServer, {
            requestMethod: 'GET',
            url: /getQuote.*destTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
            response: GASLESS_SWAP_QUOTES_ETH_MUSD,
            responseCode: 200,
          });
        },
        restartDevice: true,
        endTestfn: async () => {
          logger.debug('Gasless swap test completed');
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapWalletSwapButton();
        await device.disableSynchronization();
        await Assertions.expectElementToBeVisible(QuoteView.selectAmountLabel, {
          description: 'Swap amount selection visible',
        });

        // Tap Max to use maximum balance
        await QuoteView.tapMax();

        // Verify network fee shows "Included" for gasless swap
        await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
          timeout: 60000,
          description: 'Network fee label visible',
        });

        await Assertions.expectElementToBeVisible(QuoteView.includedLabel, {
          timeout: 10000,
          description: 'Gas included in quote',
        });
      },
    );
  });
});
