import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../../tests/framework/types';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import { SmokeTrade } from '../../tags';
import Assertions from '../../../tests/framework/Assertions';
import StakeView from '../../pages/Stake/StakeView';
import { AnvilPort } from '../../../tests/framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';

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
