import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import TokensView from '../../page-objects/wallet/TokensView';
import StakeView from '../../page-objects/Stake/StakeView';
import EarnLendingView from '../../page-objects/Earn/EarnLendingView';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import { SmokeTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import { AnvilManager } from '../../seeder/anvil-manager';
import { Mockttp } from 'mockttp';
import { setupLendingMocks } from '../../api-mocking/mock-responses/earn/lending-mocks';
import {
  createLendingFixture,
  type LendingFixtureOptions,
} from './helpers/lending-fixture';

describe(SmokeTrade('Lending Deposit from Wallet'), (): void => {
  const DEPOSIT_AMOUNT = '100';

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(300000);
  });

  it('deposits USDC into Aave lending market', async (): Promise<void> => {
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
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupLendingMocks(mockServer, {
            hasExistingPosition: false,
          });
        },
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        try {
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
          await Gestures.waitAndTap(EarnLendingView.confirmButtonByLabel, {
            timeout: 60000,
            elemDescription: 'Deposit Confirm button on lending confirmation',
          });
          await FooterActions.tapConfirmButton();
        } finally {
          await device.enableSynchronization();
        }

        await TabBarComponent.tapActivity();
        await Assertions.expectElementToBeVisible(
          ActivitiesView.lendingDepositActivity,
          {
            timeout: 120000,
            description: 'Lending deposit activity should appear after deposit',
          },
        );
        await Assertions.expectElementToBeVisible(
          ActivitiesView.confirmedLabel,
          {
            timeout: 120000,
            description: 'Lending deposit should show Confirmed status',
          },
        );
      },
    );
  });
});
