import {
  Matchers,
  Gestures,
  Assertions,
  Utilities,
  type AppiumElement,
} from '../../framework';
import { PredictBalanceSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';

class PredictBalance {
  get balanceCard(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD);
  }

  get withdrawButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.WITHDRAW_BUTTON);
  }

  get positionsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.POSITIONS_BUTTON);
  }

  async tapWithdraw(): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.withdrawButton, 15000);
    await Gestures.waitAndTap(this.withdrawButton, {
      elemDescription: 'Predict Withdraw button',
    });
  }

  async tapPositions(): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.positionsButton, 15000);
    await Gestures.waitAndTap(this.positionsButton, {
      elemDescription: 'Predict Positions button',
    });
  }

  async expectBalanceCardVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.balanceCard, {
      description: 'Predict balance card should be visible',
    });
  }
}

export default new PredictBalance();
