import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { LocalNode, LocalNodeType } from '../../framework/types.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../framework/fixtures/FixtureBuilder.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensFullView from '../../page-objects/wallet/HomeSections.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import { SmokeStake } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import StakeView from '../../page-objects/Stake/StakeView.js';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils.js';
import { AnvilManager } from '../../seeder/anvil-manager.js';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers.js';

appiumTest.describe(SmokeStake('Stake from Actions'), () => {
  const FIRST_ROW = 0;
  const AMOUNT_TO_STAKE = '1';

  appiumTest(
    'should be able to import stake test account with funds',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const chainId = '0x1';

      await withFixtures(
        {
          fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
            const node = localNodes?.[0] as unknown as AnvilManager;
            const rpcPort =
              node instanceof AnvilManager
                ? (node.getPort() ?? AnvilPort())
                : undefined;

            return new FixtureBuilder()
              .withPolygon()
              .withNetworkController({
                chainId,
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Localhost',
                ticker: 'ETH',
              })
              .withNetworkEnabledMap({ eip155: { [chainId]: true } })
              .build();
          },
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1,
                // Fork mainnet so the staking contract is available
                forkUrl: `https://mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`,
              },
            },
          ],
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: async (mockServer: Mockttp) => {
            // Mock Accounts API V4 (flat array) so the app reports correct ETH balance.
            // Without this, the default mock returns 0 balance and the Earn button
            // is hidden (StakeButton returns null when balanceFiatNumber < 0.01).
            await setupMockRequest(mockServer, {
              url: /accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/balances/,
              response: {
                balances: [
                  {
                    object: 'token',
                    address: '0x0000000000000000000000000000000000000000',
                    symbol: 'ETH',
                    name: 'Ether',
                    type: 'native',
                    decimals: 18,
                    chainId: 1,
                    balance: '10000.000000000000000000',
                    accountAddress: `eip155:1:${DEFAULT_FIXTURE_ACCOUNT}`,
                  },
                ],
                unprocessedNetworks: [],
              },
              requestMethod: 'GET',
              responseCode: 200,
            });

            // Mock Accounts API V2 (per-account balances) for the same reason.
            await setupMockRequest(mockServer, {
              url: /accounts\.api\.cx\.metamask\.io\/v2\/accounts\/[^/]+\/balances/,
              response: {
                count: 1,
                balances: [
                  {
                    object: 'token',
                    address: '0x0000000000000000000000000000000000000000',
                    symbol: 'ETH',
                    name: 'Ether',
                    type: 'native',
                    timestamp: '2015-07-30T15:26:13.000Z',
                    decimals: 18,
                    chainId: 1,
                    balance: '10000.0',
                  },
                ],
                unprocessedNetworks: [],
              },
              requestMethod: 'GET',
              responseCode: 200,
            });

            await setupMockRequest(mockServer, {
              url: /transaction\.api\.cx\.metamask\.io\/networks\/\d+\/getFees/,
              response: {
                blockNumber: '0x1',
                baseFeePerGas: '0x3B9ACA00',
                priorityFeeRange: ['0x3B9ACA00', '0x77359400'],
                estimatedBaseFees: {
                  medium: [
                    {
                      maxPriorityFeePerGas: '0x3B9ACA00',
                      maxFeePerGas: '0x77359400',
                    },
                  ],
                },
              },
              requestMethod: 'POST',
              responseCode: 200,
            });
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await Assertions.expectElementToBeVisible(WalletView.earnButton, {
            timeout: 60000,
            description:
              'Earn button should be visible after balance loads from fixture state',
          });

          await WalletView.tapOnEarnButton();
          await Assertions.expectElementToBeVisible(StakeView.stakeContainer);
          await StakeView.enterAmount(AMOUNT_TO_STAKE);
          await StakeView.tapReviewWithRetry(30000);
          await Assertions.expectElementToBeVisible(StakeView.confirmButton, {
            timeout: 30000,
          });
          await StakeView.tapConfirm(30000);

          await Assertions.expectElementToBeVisible(
            ActivitiesView.stakeDepositedLabel,
            {
              description: 'Staking deposit activity row title',
              timeout: 120000,
            },
          );
          await Assertions.expectElementToHaveText(
            ActivitiesView.transactionStatus(FIRST_ROW),
            ActivitiesViewSelectorsText.CONFIRM_TEXT,
            { timeout: 120000 },
          );

          // Go back to Home tab
          await TabBarComponent.tapHome();

          // Navigate to TokensFullView and filter by Localhost
          await NetworkManager.navigateToTokensFullView();
          await NetworkManager.openNetworkManager();
          await NetworkManager.tapNetwork('eip155:1');

          // Verify staked asset in wallet (now in TokensFullView)
          await TokensFullView.expectStakedEthereumRowWithBalancesVisible();
        },
      );
    },
  );
});
