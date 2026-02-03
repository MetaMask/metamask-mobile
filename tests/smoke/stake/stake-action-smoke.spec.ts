import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { LocalNode, LocalNodeType } from '../../framework/types.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';
import ActivitiesView from '../../../e2e/pages/Transactions/ActivitiesView.ts';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import WalletView from '../../../e2e/pages/wallet/WalletView.ts';
import NetworkListModal from '../../../e2e/pages/Network/NetworkListModal.ts';
import { SmokeTrade } from '../../../e2e/tags';
import Assertions from '../../framework/Assertions.ts';
import StakeView from '../../../e2e/pages/Stake/StakeView.ts';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils.ts';
import { AnvilManager } from '../../seeder/anvil-manager.ts';

describe(SmokeTrade('Stake from Actions'), (): void => {
  const FIRST_ROW: number = 0;
  const AMOUNT_TO_STAKE: string = '1';

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(120000);
  });

  it('should be able to import stake test account with funds', async (): Promise<void> => {
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
              providerConfig: {
                chainId,
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Localhost',
                ticker: 'ETH',
              },
            })
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
      },
      async () => {
        await loginToApp();
        await WalletView.tapOnEarnButton();
        await Assertions.expectElementToBeVisible(StakeView.stakeContainer);
        await StakeView.enterAmount(AMOUNT_TO_STAKE);
        await Assertions.expectElementToBeVisible(StakeView.reviewButton);
        await StakeView.tapReview();
        await Assertions.expectElementToBeVisible(StakeView.confirmButton);
        await StakeView.tapConfirm();

        await Assertions.expectElementToBeVisible(
          ActivitiesView.stakeDepositedLabel,
        );
        await Assertions.expectElementToHaveText(
          ActivitiesView.transactionStatus(FIRST_ROW),
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
          { timeout: 120000 },
        );

        // Go back to Home tab
        await TabBarComponent.tapHome();

        // Open network picker and select Localhost
        await WalletView.tapTokenNetworkFilter();
        await NetworkListModal.changeNetworkTo('Localhost');

        // Verify staked asset in wallet
        await Assertions.expectTextDisplayed('Staked Ethereum');
        await Assertions.expectTextDisplayed('1 ETH');
        await Assertions.expectTextDisplayed('$4,291.85');
      },
    );
  });
});
