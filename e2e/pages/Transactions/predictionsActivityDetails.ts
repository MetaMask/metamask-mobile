import { PredictActivityDetailsSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';

class PredictActivityDetails {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.CONTAINER,
    );
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.BACK_BUTTON,
    );
  }

  get amountDisplay(): DetoxElement {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.AMOUNT_DISPLAY,
    );
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton);
  }
}

export default new PredictActivityDetails();
