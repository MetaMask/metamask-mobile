import { PredictActivityDetailsSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework';

class PredictActivityDetails {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.CONTAINER,
    );
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.BACK_BUTTON,
    );
  }

  get amountDisplay(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictActivityDetailsSelectorsIDs.AMOUNT_DISPLAY,
    );
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton);
  }
}

export default new PredictActivityDetails();
