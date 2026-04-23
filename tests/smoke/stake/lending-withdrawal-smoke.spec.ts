import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import TokensView from '../../page-objects/wallet/TokensView';
import EarnLendingView from '../../page-objects/Earn/EarnLendingView';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import StakeView from '../../page-objects/Stake/StakeView';
import { SmokeTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import { AnvilManager } from '../../seeder/anvil-manager';
import { Mockttp } from 'mockttp';
import { setupLendingMocks } from '../../api-mocking/mock-responses/earn/lending-mocks';
import {
  createLendingFixture,
  type LendingFixtureOptions,
} from './helpers/lending-fixture';

describe(SmokeTrade('Lending Withdrawal from Wallet'), (): void => {
  const WITHDRAW_AMOUNT = '50';

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(300000);
  });

  it('withdraws USDC from Aave lending position', async (): Promise<void> => {
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
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupLendingMocks(mockServer, {
            hasExistingPosition: true,
          });
        },
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await WalletView.tapOnTokensSection();
        await TokensView.tapNetworkFilter();
        await TokensView.tapAllPopularNetworks();
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
        await Assertions.expectElementToBeVisible(
          ActivitiesView.confirmedLabel,
          {
            timeout: 120000,
            description: 'Lending withdrawal should show Confirmed status',
          },
        );
      },
    );
  });
});
