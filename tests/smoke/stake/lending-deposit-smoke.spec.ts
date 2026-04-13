import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import StakeView from '../../page-objects/Stake/StakeView';
import EarnLendingView from '../../page-objects/Earn/EarnLendingView';
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
              forkUrl: `https://mainnet.infura.io/v3/79dfd08201b1415186862245a546ec91`,
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
          await Assertions.expectElementToBeVisible(WalletView.lendingEarnCta, {
            timeout: 45000,
            description:
              'USDC Earn CTA should be visible in token list secondary balance',
          });
          await Gestures.waitAndTap(WalletView.lendingEarnCta, {
            elemDescription: 'USDC lending Earn CTA',
          });

          await StakeView.enterAmount(DEPOSIT_AMOUNT);
          await StakeView.tapReviewWithRetry(30000);

          await EarnLendingView.expectDepositConfirmationVisible();
          await EarnLendingView.expectConfirmButtonVisible(30000);
          await EarnLendingView.tapConfirmWithRetry(60000);
        } finally {
          await device.enableSynchronization();
        }

        await TabBarComponent.tapActivity();
        await Assertions.expectElementToBeVisible(
          ActivitiesView.approveActivity,
          {
            timeout: 120000,
            description: 'Approve activity should appear for token allowance',
          },
        );
      },
    );
  });
});
