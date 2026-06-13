import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PredictUnavailableSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import { EncapsulatedElementType } from '../../framework';

class PredictUnavailableView {
  get title(): EncapsulatedElementType {
    return Matchers.getElementByText(PredictUnavailableSelectorsIDs.TITLE_TEXT);
  }

  get description(): EncapsulatedElementType {
    return Matchers.getElementByText(
      PredictUnavailableSelectorsIDs.DESCRIPTION_TEXT,
    );
  }

  get gotItButton(): EncapsulatedElementType {
    return Matchers.getElementByText(
      PredictUnavailableSelectorsIDs.BUTTON_TEXT,
    );
  }

  async expectVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.title, {
      description: 'Predict Unavailable title visible',
    });
    await Assertions.expectElementToBeVisible(this.gotItButton, {
      description: 'Predict Unavailable Got it button visible',
    });
  }

  async tapGotIt(): Promise<void> {
    await Gestures.waitAndTap(this.gotItButton, {
      elemDescription: 'Tap Got it on Predict Unavailable',
    });
  }
}

export default new PredictUnavailableView();
