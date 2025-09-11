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
import PerpsDepositView from '../../pages/Perps/PerpsDepositView';
import PerpsE2E from '../../framework/PerpsE2E';
import Gestures from '../../framework/Gestures';
import ToastModal from '../../pages/wallet/ToastModal';
import Utilities from '../../framework/Utilities';

// We reuse the confirmation screen keyboard and continue button by text/selectors

describe(RegressionTrade('Perps - Add funds (has funds, not first time)'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('deposits $100 from Add funds and verifies updated balance', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPerpsProfile('no-positions')
          .withPerpsFirstTimeUser(false)
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
          .withTokensForAllPopularNetworks([
            {
              address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
              symbol: 'USDC',
              decimals: 6,
              name: 'USD Coin',
              type: 'erc20',
            },
          ])
          .build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
        localNodeOptions: [
          {
            type: LocalNodeType.anvil,
            options: { hardfork: 'prague' as Hardfork },
          },
        ],
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(WalletView.container as DetoxElement, {
          description: 'Wallet view visible',
        });

        // Go to Perps tab
        await PerpsHelpers.navigateToPerpsTab();

        // Read initial balance text for later comparison
        const initialBalance = await PerpsTabView.getBalance();

        // Open Add Funds from balance menu
        await PerpsTabView.tapBalanceButton();
        await PerpsTabView.tapAddFundsButton();

        // If a network-added toast appears, wait for it to disappear before interacting
        await Assertions.expectElementToNotBeVisible(
          ToastModal.container as DetoxElement,
          { description: 'No toast visible before entering amount', timeout: 10000 },
        );

        // Ensure deposit UI visible
        await PerpsDepositView.expectLoaded();

        // Open Pay with selector and choose USDC
        await PerpsDepositView.selectUSDC();

        // Focus and type 80 using keypad helpers
        await PerpsDepositView.focusAmount();
        await PerpsDepositView.typeUSD('80');

        // Continue and Confirm
        await PerpsDepositView.tapContinue();
        await PerpsDepositView.tapConfirm();

        // Apply deposit mock and wait for wallet balance to increase
        await PerpsE2E.applyDepositUSD('80');
        await Utilities.waitUntil(
          async () => {
            const current = await PerpsTabView.getBalance();
            return current > initialBalance;
          },
          { interval: 500, timeout: 15000 },
        );

        // Back on Perps tab, read balance and assert increment by 80
        const updatedBalance = await PerpsTabView.getBalance();
        if (!(updatedBalance > initialBalance)) {
          throw new Error(
            `Balance did not increase: before=${initialBalance}, after=${updatedBalance}`,
          );
        }
      },
    );
  });
});
