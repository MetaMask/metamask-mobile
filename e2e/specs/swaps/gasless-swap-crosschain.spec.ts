import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import { SmokeTrade } from '../../tags';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import { loginToApp } from '../../viewHelper';
import { logger } from '../../framework/logger';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';
import QuoteView from '../../pages/swaps/QuoteView';
import Matchers from '../../framework/Matchers';

// Test for: E2E — Gasless Swap (No ETH) → Successful Crosschain Bridge
// Goal: Validate the primary user flow: fully gasless bridging from Ethereum

describe(
  SmokeTrade('Gasless Swap (No ETH) - Successful Crosschain Bridge'),
  (): void => {
    const FIRST_ROW: number = 0;

    beforeEach(async (): Promise<void> => {
      jest.setTimeout(120000);
    });

    it('should complete gasless crosschain swap from ETH.USDC to BSC.USDC without ETH balance', async (): Promise<void> => {
      const quantity = '10';
      const sourceChainId = '0x1'; // Ethereum Mainnet
      const destChainId = '0x38'; // BSC
      const sourceTokenSymbol = 'USDC';
      const sourceTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // ETH USDC
      const destNetwork = 'BNB Smart Chain';

      await withFixtures(
        {
          fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
            const node = localNodes?.[0] as unknown as AnvilManager;
            const rpcPort =
              node instanceof AnvilManager
                ? (node.getPort() ?? AnvilPort())
                : undefined;

            return (
              new FixtureBuilder()
                .withNetworkController({
                  providerConfig: {
                    chainId: sourceChainId,
                    rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                    type: 'custom',
                    nickname: 'Localhost',
                    ticker: 'ETH',
                  },
                })
                .withMetaMetricsOptIn()
                // Explicitly enable Smart Transactions (STX) for gasless swaps
                .withPreferencesController({
                  smartTransactionsOptInStatus: true,
                })
                .withTokensForAllPopularNetworks([
                  {
                    address: sourceTokenAddress,
                    decimals: 6,
                    symbol: sourceTokenSymbol,
                    name: 'USD Coin',
                  },
                ])
                .build()
            );
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
            // Mock gasless quote response from bridge API
            await mockServer
              .forGet(/bridge\.api\.cx\.metamask\.io\/getAllQuotes/)
              .thenCallback(async () => ({
                  statusCode: 200,
                  json: {
                    quotes: [
                      {
                        requestId: 'gasless-test-request-id',
                        srcChainId: 1,
                        srcTokenAmount: (parseInt(quantity) * 1e6).toString(), // USDC has 6 decimals
                        srcAsset: {
                          address: sourceTokenAddress,
                          chainId: 1,
                          symbol: sourceTokenSymbol,
                          decimals: 6,
                          name: 'USD Coin',
                          iconUrl: 'https://example.com/usdc.png',
                        },
                        destChainId: 56, // BSC
                        destTokenAmount: (parseInt(quantity) * 1e6).toString(),
                        destAsset: {
                          address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BSC USDC
                          chainId: 56,
                          symbol: sourceTokenSymbol,
                          decimals: 6,
                          name: 'USD Coin',
                          iconUrl: 'https://example.com/usdc.png',
                        },
                        feeData: {
                          metabridge: {
                            amount: '0',
                            asset: {
                              address: sourceTokenAddress,
                              chainId: 1,
                              symbol: sourceTokenSymbol,
                              decimals: 6,
                            },
                          },
                        },
                        gasIncluded: true, // This is the key for gasless swap
                        bridgeId: 'lifi',
                        bridges: ['across'],
                        steps: [
                          {
                            action: 'bridge',
                            srcChainId: 1,
                            destChainId: 56,
                            protocol: {
                              name: 'across',
                              displayName: 'Across',
                            },
                          },
                        ],
                        priceData: {
                          totalFromAmountUsd: quantity,
                          totalToAmountUsd: quantity,
                          priceImpact: '0',
                        },
                      },
                    ],
                  },
                }));

            // Mock the bridge transaction submission
            await mockServer
              .forPost(/bridge\.api\.cx\.metamask\.io\/submitBridge/)
              .thenCallback(async () => ({
                  statusCode: 200,
                  json: {
                    trade: {
                      // Mock trade data
                      data: '0x',
                      to: '0x1234567890123456789012345678901234567890',
                      value: '0x0',
                      gasLimit: '0x5208',
                    },
                    estimatedProcessingTimeInSeconds: 30,
                  },
                }));

            // Mock feature flags to enable gasless swaps
            await mockServer
              .forGet(/static\.cx\.metamask\.io\/api\/v1\/remote-feature-flags/)
              .thenCallback(async () => ({
                  statusCode: 200,
                  json: {
                    bridge: {
                      sendBundle: true,
                    },
                  },
                }));
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

          await Assertions.expectElementToBeVisible(
            QuoteView.selectAmountLabel,
          );
          await QuoteView.enterAmount(quantity);

          await QuoteView.tapSourceToken();
          await QuoteView.tapToken(sourceChainId, sourceTokenSymbol);

          await QuoteView.tapDestinationToken();
          await QuoteView.swipeNetwork('Ethereum', 0.8);
          await QuoteView.selectNetwork(destNetwork);
          await QuoteView.tapToken(destChainId, sourceTokenSymbol);

          await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
            timeout: 60000,
            description: 'Network fee label should be visible',
          });

          const includedLabel = Matchers.getElementByText('Included');
          await Assertions.expectElementToBeVisible(includedLabel, {
            timeout: 10000,
            description: 'Gas should be included in quote',
          });

          await Assertions.expectElementToBeVisible(QuoteView.confirmBridge);
          await QuoteView.tapConfirmBridge();

          await Assertions.expectElementToBeVisible(ActivitiesView.title, {
            timeout: 30000,
            description: 'Activities view should be visible',
          });

          await Assertions.expectElementToBeVisible(
            ActivitiesView.bridgeActivityTitle(destNetwork),
            {
              timeout: 30000,
              description: 'Bridge activity should be visible in activity list',
            },
          );

          await Assertions.expectElementToHaveText(
            ActivitiesView.transactionStatus(FIRST_ROW),
            ActivitiesViewSelectorsText.CONFIRM_TEXT,
            {
              timeout: 60000,
              description: 'Transaction should be confirmed',
            },
          );
        },
      );
    });
  },
);
