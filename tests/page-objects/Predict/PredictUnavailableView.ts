import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { PredictUnavailableSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class PredictUnavailableView {
  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(PredictUnavailableSelectorsIDs.TITLE_TEXT),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PredictUnavailableSelectorsIDs.TITLE_TEXT,
        ),
    });
  }

  get description(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          PredictUnavailableSelectorsIDs.DESCRIPTION_TEXT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PredictUnavailableSelectorsIDs.DESCRIPTION_TEXT,
        ),
    });
  }

  get gotItButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(PredictUnavailableSelectorsIDs.BUTTON_TEXT),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PredictUnavailableSelectorsIDs.BUTTON_TEXT,
        ),
    });
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
    await UnifiedGestures.waitAndTap(this.gotItButton, {
      elemDescription: 'Tap Got it on Predict Unavailable',
    });
  }
}

export default new PredictUnavailableView();
