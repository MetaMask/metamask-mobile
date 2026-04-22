import { Matchers, Gestures, Assertions } from '../../framework';
import {
  PredictBalanceSelectorsIDs,
  PredictBalanceSelectorsText,
} from '../../../app/components/UI/Predict/Predict.testIds';

class PredictBalance {
  get balanceCard(): DetoxElement {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD);
  }

  get withdrawButton(): DetoxElement {
    return Matchers.getElementByText(PredictBalanceSelectorsText.WITHDRAW);
  }

  async tapWithdraw(): Promise<void> {
    await Gestures.waitAndTap(this.withdrawButton, {
      elemDescription: 'Predict Withdraw button',
    });
  }

  async expectBalanceCardVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.balanceCard, {
      description: 'Predict balance card should be visible',
    });
  }
}

export default new PredictBalance();
