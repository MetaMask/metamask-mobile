import TestHelpers from '../../../helpers';
import QuoteView from '../../../pages/swaps/QuoteView';
import Assertions from '../../../../tests/framework/Assertions';
import ActivitiesView from '../../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../../../app/components/Views/ActivityView/ActivitiesView.testIds';

export async function submitSwapUnifiedUI(
  quantity: string,
  sourceTokenSymbol: string,
  destTokenSymbol: string,
  chainId: string,
) {
  await device.disableSynchronization();
  await Assertions.expectElementToBeVisible(QuoteView.selectAmountLabel);
  await QuoteView.enterAmount(quantity);
  if (sourceTokenSymbol !== 'ETH') {
    await QuoteView.tapSourceToken();
    await QuoteView.tapToken(chainId, sourceTokenSymbol);
  }
  await QuoteView.tapDestinationToken();
  await QuoteView.tapToken(chainId, destTokenSymbol);

  await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
    timeout: 60000,
  });
  await Assertions.expectElementToBeVisible(QuoteView.confirmSwap);
  await QuoteView.tapConfirmSwap();
}

export async function checkSwapActivity(
  sourceTokenSymbol: string,
  destTokenSymbol: string,
) {
  const FIRST_ROW: number = 0;
  const SECOND_ROW: number = 1;

  // Check the swap activity completed
  await Assertions.expectElementToBeVisible(ActivitiesView.title);
  await Assertions.expectElementToBeVisible(
    ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
  );
  await Assertions.expectElementToHaveText(
    ActivitiesView.transactionStatus(FIRST_ROW),
    ActivitiesViewSelectorsText.CONFIRM_TEXT,
  );

  // Check the token approval completed
  if (sourceTokenSymbol !== 'ETH') {
    await Assertions.expectElementToBeVisible(
      ActivitiesView.swapApprovalActivityTitle(sourceTokenSymbol),
    );
    await Assertions.expectElementToHaveText(
      ActivitiesView.transactionStatus(SECOND_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
    );
  }

  // Wait for tx toast to clear
  await TestHelpers.delay(5000);
}
