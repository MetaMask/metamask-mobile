import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { LocalNode, LocalNodeType } from '../../framework/types.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensView from '../../page-objects/wallet/TokensView.js';
import EarnLendingView from '../../page-objects/Earn/EarnLendingView.js';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import StakeView from '../../page-objects/Stake/StakeView.js';
import { SmokeStake } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import { AnvilManager } from '../../seeder/anvil-manager.js';
import { Mockttp } from 'mockttp';
import { setupLendingMocks } from '../../api-mocking/mock-responses/earn/lending-mocks.js';
import {
  createLendingFixture,
  type LendingFixtureOptions,
} from './helpers/lending-fixture.js';

appiumTest.describe(SmokeStake('Lending Withdrawal from Wallet'), () => {
  const WITHDRAW_AMOUNT = '50';

  // Seed includes Aave supply on an Infura fork (up to ~2m) plus full withdraw UI.
  appiumTest.describe.configure({ timeout: 600000 });

  appiumTest(
    'withdraws USDC from Aave lending position',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const fixtureOptions: LendingFixtureOptions = {
        hasExistingPosition: true,
      };

      await withFixtures(
        {
          fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
            const node = localNodes?.[0] as unknown as AnvilManager;
            return createLendingFixture(node, fixtureOptions);
          },
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1,
                forkUrl: `https://mainnet.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`,
              },
            },
          ],
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupLendingMocks(mockServer, {
              hasExistingPosition: true,
            });
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await WalletView.tapOnTokensSection();
          await TokensView.tapNetworkFilter();
          await TokensView.tapAllPopularNetworks();
          await TokensView.waitForTokenBalance('aEthUSDC');
          await TokensView.tapToken('aEthUSDC');
          await EarnLendingView.tapWithdraw();

          await StakeView.enterAmount(WITHDRAW_AMOUNT);
          await EarnLendingView.tapReviewButton(30000);

          await EarnLendingView.expectWithdrawalConfirmationVisible();
          await EarnLendingView.expectConfirmButtonVisible(30000);
          await EarnLendingView.tapConfirm(30000);
          await FooterActions.tapConfirmButton();

          await TabBarComponent.tapActivity();
          await Assertions.expectElementToBeVisible(
            ActivitiesView.lendingWithdrawalActivity,
            {
              timeout: 120000,
              description:
                'Lending withdrawal activity should appear after withdrawal',
            },
          );
          await ActivitiesView.waitForTransactionConfirmed(0, 120000);
        },
      );
    },
  );
});
