import Matchers from '../../framework/Matchers';
import { SpamFilterModalSelectorText } from '../../selectors/Browser/SpamFilterModal.selectors';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SpamFilterModal {
  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(SpamFilterModalSelectorText.TITLE),
      appium: () =>
        PlaywrightMatchers.getElementByText(SpamFilterModalSelectorText.TITLE),
    });
  }

  get cancelButtonText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(SpamFilterModalSelectorText.CANCEL_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SpamFilterModalSelectorText.CANCEL_BUTTON,
        ),
    });
  }

  async tapCloseButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButtonText, {
      elemDescription: 'Tap on the close button',
    });
  }
}

export default new SpamFilterModal();
