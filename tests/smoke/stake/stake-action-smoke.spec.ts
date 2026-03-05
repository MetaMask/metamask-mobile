import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import { loginToApp } from '../../flows/wallet.flow';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import WalletView from '../../page-objects/wallet/WalletView';
import NetworkListModal from '../../page-objects/Network/NetworkListModal';
import { SmokeTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import StakeView from '../../page-objects/Stake/StakeView';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';

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
              forkUrl: `https://mainnet.infura.io/v3/ce960be3442049ababedfc212d57b24b`,
            },
          },
        ],
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupMockRequest(mockServer, {
            url: /transaction\.api\.cx\.metamask\.io\/networks\/\d+\/getFees/,
            response: {
              blockNumber: '0x1',
              baseFeePerGas: '0x3B9ACA00',
              priorityFeeRange: ['0x3B9ACA00', '0x77359400'],
              estimatedBaseFees: {
                medium: [
                  {
                    maxPriorityFeePerGas: '0x3B9ACA00',
                    maxFeePerGas: '0x77359400',
                  },
                ],
              },
            },
            requestMethod: 'POST',
            responseCode: 200,
          });
        },
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
