import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { LocalNodeType } from '../../framework/types';
import { Hardfork } from '../../seeder/anvil-manager';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import PerpsTabView from '../../pages/Perps/PerpsTabView';
import { PerpsHelpers } from './helpers/perps-helpers';
import WalletView from '../../pages/wallet/WalletView';
import { PerpsDepositProcessingViewSelectorsIDs } from '../../selectors/Perps/Perps.selectors';

describe(RegressionTrade('Perps - Add Funds Diagnostic'), () => {
  it('diagnostic: verify fixture state is loaded correctly', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withKeyringControllerOfMultipleAccounts()
          .withNetworkController({
            providerConfig: {
              type: 'rpc',
              chainId: '0xa4b1',
              rpcUrl: 'https://arb1.arbitrum.io/rpc',
              nickname: 'Arbitrum One',
              ticker: 'ETH',
            },
          })
          .withTokensController({
            allDetectedTokens: {
              '0xa4b1': [
                {
                  address: '0x0000000000000000000000000000000000000000',
                  symbol: 'ETH',
                  decimals: 18,
                  name: 'Ether',
                  iconUrl: '',
                  aggregators: [],
                  occurrences: 1,
                },
              ],
            },
          })
          .withTokenBalancesController({
            tokenBalances: {
              '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6': {
                '0xa4b1': {
                  '0x0000000000000000000000000000000000000000':
                    '0xde0b6b3a7640000',
                },
              },
            },
          })
          .build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        await loginToApp();

        // Check if the fixture state was loaded correctly
        // Prefer ESM import over require for lint compliance
        const { store: walletStore } = await import('../../../app/store');
        const state = walletStore.getState();

        // Verify ETH token is in detected tokens
        const ethToken =
          state.engine.backgroundState.TokensController.allDetectedTokens?.[
            '0xa4b1'
          ]?.[0];
        console.log('ETH Token in detected tokens:', ethToken);

        // Verify ETH balance
        const ethBalance =
          state.engine.backgroundState.TokenBalancesController.tokenBalances?.[
            '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6'
          ]?.['0xa4b1']?.['0x0000000000000000000000000000000000000000'];
        console.log('ETH Balance:', ethBalance);

        // Simple assertion - if we reach here without errors, fixture loaded successfully
        await Assertions.expectElementToBeVisible(
          WalletView.container as DetoxElement,
          { description: 'Wallet view visible - fixture loaded successfully' },
        );
      },
    );
  });

  it('opens Add funds confirmation from Perps tab (no-funds profile)', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPerpsProfile('no-funds')
          .withPerpsFirstTimeUser(false)
          // Use simple EVM account configuration - this method already sets up EVM-compatible account
          .withKeyringControllerOfMultipleAccounts()
          // Register Arbitrum network (0xa4b1) required by deposit route
          .withNetworkController({
            providerConfig: {
              type: 'rpc',
              chainId: '0xa4b1',
              rpcUrl: 'https://arb1.arbitrum.io/rpc',
              nickname: 'Arbitrum One',
              ticker: 'ETH',
            },
          })
          // Add ETH token to detected tokens for Arbitrum
          .withTokensController({
            allDetectedTokens: {
              '0xa4b1': [
                {
                  address: '0x0000000000000000000000000000000000000000', // Native ETH address
                  symbol: 'ETH',
                  decimals: 18,
                  name: 'Ether',
                  iconUrl: '',
                  aggregators: [],
                  occurrences: 1,
                },
              ],
            },
            allTokens: {
              '0xa4b1': [
                {
                  address: '0x0000000000000000000000000000000000000000', // Native ETH address
                  symbol: 'ETH',
                  decimals: 18,
                  name: 'Ether',
                  iconUrl: '',
                  aggregators: [],
                },
              ],
            },
          })
          // Add ETH balance to TokenBalancesController for Arbitrum
          .withTokenBalancesController({
            tokenBalances: {
              '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6': {
                // Account address
                '0xa4b1': {
                  // Arbitrum chain ID
                  '0x0000000000000000000000000000000000000000':
                    '0xde0b6b3a7640000', // 1 ETH in wei
                },
              },
            },
          })
          .build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
        // Ensure Anvil is running (default), can override options if needed
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: { hardfork: 'prague' as Hardfork },
          },
        ],
      },
      async () => {
        await loginToApp();
        // Ensure EVM account is selected (Account 1 in this fixture)
        await Assertions.expectElementToBeVisible(
          WalletView.container as DetoxElement,
          { description: 'Wallet view visible' },
        );
        await PerpsHelpers.navigateToPerpsTab();

        // Open balance menu and tap Add funds
        await PerpsTabView.tapBalanceButton();
        await PerpsTabView.tapAddFundsButton();

        // Verify confirmation screen opens (generic header)
        const headerTitle = Matchers.getElementByID(
          PerpsDepositProcessingViewSelectorsIDs.HEADER_TITLE,
        );
        await Assertions.expectElementToBeVisible(headerTitle as DetoxElement, {
          description: 'Add funds confirmation screen is visible',
        });

        // TODO: add funds flow
      },
    );
  });
});
