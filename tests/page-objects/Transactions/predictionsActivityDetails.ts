import { PredictActivityDetailsSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';

class PredictActivityDetails {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.CONTAINER,
    );
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.BACK_BUTTON,
    );
  }

  get amountDisplay(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.AMOUNT_DISPLAY,
    );
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton);
  }
}

export default new PredictActivityDetails();
