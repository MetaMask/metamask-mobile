import { PredictActivityDetailsSelectorsIDs } from '../../selectors/Predict/Predict.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

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

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton);
  }
}

export default new PredictActivityDetails();
