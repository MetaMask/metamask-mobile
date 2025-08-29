import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNodeType } from '../../framework/types';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Assertions from '../../framework/Assertions';
import { defaultGanacheOptions } from '../../framework/Constants';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import { RegressionTrade } from '../../tags';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import { submitSwapUnifiedUI } from './helpers/swapUnifiedUI';
import { loginToApp } from '../../viewHelper';
import { prepareSwapsTestEnvironment } from './helpers/prepareSwapsTestEnvironment';
import { testSpecificMock } from './helpers/swap-mocks';

describe(RegressionTrade('Multiple Swaps from Actions'), (): void => {
  const FIRST_ROW: number = 0;
  const SECOND_ROW: number = 1;

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(120000);
  });

  // TODO: Add mock responses for DAI tokens to enable these test cases
  // ${'native'}     | ${'.03'} | ${'ETH'}          | ${'DAI'}        | ${'0x1'}
  // ${'unapproved'} | ${'3'}   | ${'DAI'}          | ${'USDC'}       | ${'0x1'}
  // ${'erc20'}      | ${'10'}  | ${'DAI'}          | ${'ETH'}        | ${'0x1'}
  it.each`
    type        | quantity | sourceTokenSymbol | destTokenSymbol | chainId
    ${'native'} | ${'1'}   | ${'ETH'}          | ${'USDC'}       | ${'0x1'}
  `(
    "should swap $type token '$sourceTokenSymbol' to '$destTokenSymbol' on chainID='$chainId'",
    async ({
      type,
      quantity,
      sourceTokenSymbol,
      destTokenSymbol,
      chainId,
    }): Promise<void> => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withGanacheNetwork('0x1')
            .withDisabledSmartTransactions()
            .build(),
          localNodeOptions: [
            {
              type: LocalNodeType.ganache,
              options: {
                ...defaultGanacheOptions,
                chainId: 1,
              },
            },
          ],
          testSpecificMock,
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await prepareSwapsTestEnvironment();
          await TabBarComponent.tapActions();
          await Assertions.expectElementToBeVisible(
            WalletActionsBottomSheet.swapButton,
          );
          await WalletActionsBottomSheet.tapSwapButton();

          // Submit the Swap
          await submitSwapUnifiedUI(
            quantity,
            sourceTokenSymbol,
            destTokenSymbol,
            chainId,
          );

          // Check the swap activity completed
          await Assertions.expectElementToBeVisible(ActivitiesView.title);
          await Assertions.expectElementToBeVisible(
            ActivitiesView.swapActivityTitle(
              sourceTokenSymbol,
              destTokenSymbol,
            ),
          );
          await Assertions.expectElementToHaveText(
            ActivitiesView.transactionStatus(FIRST_ROW),
            ActivitiesViewSelectorsText.CONFIRM_TEXT,
          );

          // Check the token approval completed
          if (type === 'unapproved') {
            await Assertions.expectElementToBeVisible(
              ActivitiesView.tokenApprovalActivity(sourceTokenSymbol),
            );
            await Assertions.expectElementToHaveText(
              ActivitiesView.transactionStatus(SECOND_ROW),
              ActivitiesViewSelectorsText.CONFIRM_TEXT,
            );
          }
        },
      );
    },
  );
});
