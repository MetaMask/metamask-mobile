import { Matchers, Gestures, Assertions, Utilities } from '../../framework';
import { PredictBalanceSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';

class PredictBalance {
  get balanceCard(): DetoxElement {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD);
  }

  get withdrawButton(): DetoxElement {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.WITHDRAW_BUTTON);
  }

  async tapWithdraw(): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.withdrawButton, 15000);
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
