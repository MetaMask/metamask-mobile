import { PredictActivityDetailsSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class PredictActivityDetails {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictActivityDetailsSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictActivityDetailsSelectorsIDs.CONTAINER,
        ),
    });
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictActivityDetailsSelectorsIDs.BACK_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictActivityDetailsSelectorsIDs.BACK_BUTTON,
        ),
    });
  }

  get amountDisplay(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PredictActivityDetailsSelectorsIDs.AMOUNT_DISPLAY,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictActivityDetailsSelectorsIDs.AMOUNT_DISPLAY,
        ),
    });
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton);
  }
}

export default new PredictActivityDetails();
