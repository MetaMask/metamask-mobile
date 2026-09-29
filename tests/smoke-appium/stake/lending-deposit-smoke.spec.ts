import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { LocalNode, LocalNodeType } from '../../framework/types.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TokensView from '../../page-objects/wallet/TokensView.js';
import StakeView from '../../page-objects/Stake/StakeView.js';
import EarnLendingView from '../../page-objects/Earn/EarnLendingView.js';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import { SmokeStake } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import { AnvilManager } from '../../seeder/anvil-manager.js';
import { Mockttp } from 'mockttp';
import { setupLendingMocks } from '../../api-mocking/mock-responses/earn/lending-mocks.js';
import {
  createLendingFixture,
  type LendingFixtureOptions,
} from './helpers/lending-fixture.js';

appiumTest.describe(SmokeStake('Lending Deposit from Wallet'), () => {
  const DEPOSIT_AMOUNT = '100';

  appiumTest.describe.configure({ timeout: 300000 });

  appiumTest(
    'deposits USDC into Aave lending market',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const fixtureOptions: LendingFixtureOptions = {
        hasExistingPosition: false,
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
              hasExistingPosition: false,
            });
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await WalletView.tapOnTokensSection();
          await TokensView.tapNetworkFilter();
          await TokensView.tapAllPopularNetworks();
          await TokensView.tapEarnCta();

          await StakeView.enterAmount(DEPOSIT_AMOUNT);
          await StakeView.tapReview(15000);

          await EarnLendingView.expectDepositConfirmationVisible();
          await EarnLendingView.expectConfirmButtonVisible(30000);

          // Step 1: Approve — tap lending footer then confirm the spending cap
          await EarnLendingView.tapConfirm(30000);
          await FooterActions.tapConfirmButton();

          // Step 2: Deposit — wait for button label to change to "Confirm"
          await EarnLendingView.tapConfirmByLabel(60000);
          await FooterActions.tapConfirmButton(30000);

          await TabBarComponent.tapActivity();
          await Assertions.expectElementToBeVisible(
            ActivitiesView.lendingDepositActivity,
            {
              timeout: 120000,
              description:
                'Lending deposit activity should appear after deposit',
            },
          );
          await ActivitiesView.waitForTransactionConfirmed(0, 120000);
        },
      );
    },
  );
});
