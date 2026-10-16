import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { LocalNode, LocalNodeType } from '../../framework/types.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
} from '../../framework/fixtures/FixtureBuilder.js';
import { PREDEFINED_TOKENS } from '../../framework/fixtures/mmpay-token-holdings-registry.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensFullView from '../../page-objects/wallet/HomeSections.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import { SmokeStake } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import StakeView from '../../page-objects/Stake/StakeView.js';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions.js';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils.js';
import { AnvilManager } from '../../seeder/anvil-manager.js';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers.js';

appiumTest.describe(SmokeStake('Stake from Actions'), () => {
  const AMOUNT_TO_STAKE = '1';

  /**
   * The MetaMask pooled staking vault on mainnet is a private Stakewise foxVault.
   * Its deposit() function reverts for non-whitelisted addresses on the Anvil fork.
   * We replace the contract bytecode with a minimal mock that returns 1e18 (1 ETH
   * worth of shares) for any call, so gas estimation and the deposit transaction
   * both succeed. We also pre-seed stakedBalance in fixture state so the
   * "Staked Ethereum" row appears in the token list without waiting for a polling cycle.
   */
  const STAKING_CONTRACT =
    '0x4fef9d741011476750a243ac70b9789a63dd47df' as `0x${string}`;
  // PUSH8(1e18) PUSH1(0) MSTORE PUSH1(32) PUSH1(0) RETURN — returns uint256(1e18) for any call
  const MOCK_STAKING_BYTECODE =
    '0x670DE0B6B3A764000060005260206000F3' as `0x${string}`;
  const STAKED_BALANCE_1_ETH = '0xDE0B6B3A7640000';

  appiumTest(
    'should be able to import stake test account with funds',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const chainId = '0x1';

      await withFixtures(
        {
          fixture: async ({ localNodes }: { localNodes?: LocalNode[] }) => {
            const node = localNodes?.[0] as unknown as AnvilManager;
            const rpcPort =
              node instanceof AnvilManager
                ? (node.getPort() ?? AnvilPort())
                : undefined;

            if (node instanceof AnvilManager) {
              await node.setAccountBalance(
                '10',
                DEFAULT_FIXTURE_ACCOUNT_CHECKSUM as `0x${string}`,
              );
              // Replace the staking contract with a mock that always succeeds.
              const { testClient } = node.getProvider();
              await testClient.setCode({
                address: STAKING_CONTRACT,
                bytecode: MOCK_STAKING_BYTECODE,
              });
            }

            const fixture = new FixtureBuilder()
              .withPolygon()
              .withNetworkController({
                chainId,
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Localhost',
                ticker: 'ETH',
              })
              .withNetworkEnabledMap({ eip155: { [chainId]: true } })
              .withTokenHoldings([
                { ...PREDEFINED_TOKENS.ETHEREUM.ETH, amount: '10' },
              ])
              .build();

            // Pre-seed stakedBalance so the "Staked Ethereum" row is visible
            // without waiting for AccountTrackerController to poll.
            const atc =
              fixture.state.engine.backgroundState.AccountTrackerController;
            if (!atc.accountsByChainId) {
              atc.accountsByChainId = {};
            }
            if (!atc.accountsByChainId[chainId]) {
              atc.accountsByChainId[chainId] = {};
            }
            const accountEntry =
              atc.accountsByChainId[chainId][DEFAULT_FIXTURE_ACCOUNT] ?? {};
            atc.accountsByChainId[chainId][DEFAULT_FIXTURE_ACCOUNT] = {
              ...accountEntry,
              stakedBalance: STAKED_BALANCE_1_ETH,
            };

            return fixture;
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
          // Redesigned stake confirmations use confirm-button (FooterActions),
          // not the legacy text "Confirm" locator in StakeView.tapReviewWithRetry.
          await StakeView.tapReview();
          await Assertions.expectElementToBeVisible(
            FooterActions.confirmButton,
            {
              description:
                'Redesigned Confirm button should appear after Review',
            },
          );
          await FooterActions.tapConfirmButton();

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
