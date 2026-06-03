import { Matchers } from '../../framework';
import { PredictCashOutSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class PredictCashOutPage {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictCashOutSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(PredictCashOutSelectorsIDs.CONTAINER),
    });
  }
  get cashOutButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PredictCashOutSelectorsIDs.SELL_PREVIEW_CASH_OUT_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictCashOutSelectorsIDs.SELL_PREVIEW_CASH_OUT_BUTTON,
        ),
    });
  }
  async tapCashOutButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cashOutButton, {
      elemDescription: 'Cash out button',
    });
  }
}

export default new PredictCashOutPage();
