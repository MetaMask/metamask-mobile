import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Assertions from '../../framework/Assertions';
import WalletView from '../../page-objects/wallet/WalletView';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager, DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager';
import QuoteView from '../../page-objects/swaps/QuoteView';
import { setupSSEMockRequest } from '../../api-mocking/helpers/mockHelpers';
import {
  GASLESS_SWAP_QUOTES_ETH_MUSD,
  GASLESS_SWAP_QUOTES_ETH_MUSD_7702,
  GASLESS_SWAP_QUOTES_USDC_MUSD,
  toSSEResponse,
} from '../../helpers/swap/constants';
import { testSpecificMock as swapTestSpecificMock } from '../../helpers/swap/swap-mocks';
import { setupSmartTransactionsMocks } from '../../helpers/swap/smart-transactions-mocks';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment';
import { checkSwapActivity } from '../../helpers/swap/swap-unified-ui';

describe(SmokeTrade('Gasless Swap - '), (): void => {
  const chainId = '0x1';

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(180000);
  });

  it.skip('completes a gasless ETH to MUSD swap', async (): Promise<void> => {
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
          // Use the full swap mock suite (token list, spot prices, catch-alls)
          await swapTestSpecificMock(mockServer);
          // Override: return the gasless quote for MUSD instead of the default empty response.
          // Priority 1000 > 999 so this rule beats the empty-string MUSD mock in swapTestSpecificMock.
          await setupSSEMockRequest(
            mockServer,
            /getQuoteStream.*destTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
            toSSEResponse(GASLESS_SWAP_QUOTES_ETH_MUSD),
            1000,
          );
          await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
        },
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await prepareSwapsTestEnvironment();
        await WalletView.tapWalletSwapButton();
        await device.disableSynchronization();

        await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
          description: 'Swap quote view (source token area) visible',
          timeout: 20000,
        });

        await QuoteView.tapSourceAmountInput();
        await QuoteView.enterAmount('1');
        await QuoteView.tapDestinationToken();
        await QuoteView.tapToken(chainId, 'MUSD');

        // Verify network fee shows "Included" for gasless swap
        await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
          timeout: 60000,
          description: 'Network fee label visible',
        });
        await Assertions.expectElementToBeVisible(QuoteView.includedLabel, {
          timeout: 10000,
          description: 'Gas fee included in quote',
        });

        await Assertions.expectElementToBeVisible(QuoteView.confirmSwap, {
          description: 'Confirm swap button visible',
        });
        await QuoteView.tapConfirmSwap();

        await checkSwapActivity('ETH', 'MUSD');
      },
    );
  });

  it.skip('completes a gasless USDC to MUSD swap (ERC-20 source with approval)', async (): Promise<void> => {
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
              loadState: './tests/smoke/swap/withTokens.json',
            },
          },
        ],
        testSpecificMock: async (mockServer) => {
          // Use the full swap mock suite (token list, spot prices, catch-alls)
          await swapTestSpecificMock(mockServer);
          // Override the empty MUSD mock with the USDC→MUSD gasless quote.
          // Priority 1000 > 999 so this rule beats the empty-string MUSD mock in swapTestSpecificMock.
          await setupSSEMockRequest(
            mockServer,
            /getQuoteStream.*destTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
            toSSEResponse(GASLESS_SWAP_QUOTES_USDC_MUSD),
            1000,
          );
          await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
        },
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await prepareSwapsTestEnvironment();
        await WalletView.tapWalletSwapButton();
        await device.disableSynchronization();

        await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
          description: 'Swap quote view (source token area) visible',
          timeout: 20000,
        });

        await QuoteView.tapSourceToken();
        await QuoteView.tapToken(chainId, 'USDC');
        await QuoteView.tapMax();
        await QuoteView.tapDestinationToken();
        await QuoteView.tapToken(chainId, 'MUSD');

        await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
          timeout: 60000,
          description: 'Network fee label visible',
        });
        await Assertions.expectElementToBeVisible(QuoteView.includedLabel, {
          timeout: 10000,
          description: 'Gas fee included in quote',
        });

        await Assertions.expectElementToBeVisible(QuoteView.confirmSwap, {
          description: 'Confirm swap button visible',
        });
        await QuoteView.tapConfirmSwap();

        await checkSwapActivity('USDC', 'MUSD');
      },
    );
  });

  it('completes a gasless 7702 ETH to MUSD swap (native source)', async (): Promise<void> => {
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
          await swapTestSpecificMock(mockServer);
          // Priority 1000 > 999 so this rule beats the empty-string MUSD mock in swapTestSpecificMock.
          await setupSSEMockRequest(
            mockServer,
            /getQuoteStream.*destTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
            toSSEResponse(GASLESS_SWAP_QUOTES_ETH_MUSD_7702),
            1000,
          );
          await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
        },
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await prepareSwapsTestEnvironment();
        await WalletView.tapWalletSwapButton();
        await device.disableSynchronization();

        await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
          description: 'Swap quote view (source token area) visible',
          timeout: 20000,
        });

        await QuoteView.tapSourceAmountInput();
        await QuoteView.enterAmount('1');
        await QuoteView.tapDestinationToken();
        await QuoteView.tapToken(chainId, 'MUSD');

        await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
          timeout: 60000,
          description: 'Network fee label visible',
        });
        await Assertions.expectElementToBeVisible(QuoteView.includedLabel, {
          timeout: 10000,
          description: 'Gas fee included in quote (7702)',
        });

        await Assertions.expectElementToBeVisible(QuoteView.confirmSwap, {
          description: 'Confirm swap button visible',
        });
        await QuoteView.tapConfirmSwap();

        await checkSwapActivity('ETH', 'MUSD');
      },
    );
  });
});
