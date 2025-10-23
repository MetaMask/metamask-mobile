import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { LocalNodeType } from '../../framework/types';
import { Hardfork } from '../../seeder/anvil-manager';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import Assertions from '../../framework/Assertions';
import PerpsTabView from '../../pages/Perps/PerpsTabView';
import { PerpsHelpers } from './helpers/perps-helpers';
import WalletView from '../../pages/wallet/WalletView';
import PerpsDepositView from '../../pages/Perps/PerpsDepositView';
import PerpsE2EModifiers from './helpers/perps-modifiers';
import ToastModal from '../../pages/wallet/ToastModal';
import Utilities from '../../framework/Utilities';
import { createLogger, LogLevel } from '../../framework/logger';
import PerpsDepositProcessingView from '../../pages/Perps/PerpsDepositProcessingView';

const logger = createLogger({
  name: 'PerpsAddFundsSpec',
  level: LogLevel.INFO,
});

describe(SmokeTrade('Perps - Add funds (has funds, not first time)'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('deposits $80 from Add funds and verifies updated balance', async () => {
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
        await device.disableSynchronization();
        await Assertions.expectElementToBeVisible(
          WalletView.container as DetoxElement,
          {
            description: 'Wallet view visible',
          },
        );

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
          {
            description: 'No toast visible before entering amount',
            timeout: 10000,
          },
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

        await PerpsDepositProcessingView.expectProcessingVisible();
        // Apply deposit mock and verify balance update
        await PerpsE2EModifiers.applyDepositUSD('80');
        logger.info('🔥 E2E Mock: Deposit applied');
        await Utilities.executeWithRetry(
          async () => {
            const current = await PerpsTabView.getBalance();
            await Assertions.checkIfValueIsDefined(
              current === initialBalance + 80,
            );
          },
          { interval: 500, timeout: 30000 },
        );
        await new Promise((resolve) => setTimeout(resolve, 15000));
      },
    );
  });
});
