import { Matchers, Assertions, Utilities } from '../../framework';
import { PredictBalanceSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class PredictBalance {
  get balanceCard(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictBalanceSelectorsIDs.BALANCE_CARD,
        ),
    });
  }

  get withdrawButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictBalanceSelectorsIDs.WITHDRAW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictBalanceSelectorsIDs.WITHDRAW_BUTTON,
        ),
    });
  }

  async tapWithdraw(): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.withdrawButton, 15000);
    await UnifiedGestures.waitAndTap(this.withdrawButton, {
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
