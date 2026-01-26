import Assertions from '../../../tests/framework/Assertions';
import Gestures from '../../../tests/framework/Gestures';
import Matchers from '../../../tests/framework/Matchers';
import { PredictUnavailableSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';

class PredictUnavailableView {
  get title(): DetoxElement {
    return Matchers.getElementByText(PredictUnavailableSelectorsIDs.TITLE_TEXT);
  }

  get description(): DetoxElement {
    return Matchers.getElementByText(
      PredictUnavailableSelectorsIDs.DESCRIPTION_TEXT,
    );
  }

  get gotItButton(): DetoxElement {
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
