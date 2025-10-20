import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PredictUnavailableSelectorsIDs } from '../../selectors/Predict/Predict.selectors';

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
    await Assertions.expectElementToBeVisible(this.description, {
      description: 'Predict Unavailable description visible',
    });
  }

  async tapGotIt(): Promise<void> {
    await Gestures.waitAndTap(this.gotItButton, {
      elemDescription: 'Tap Got it on Predict Unavailable',
    });
  }
}

export default new PredictUnavailableView();
