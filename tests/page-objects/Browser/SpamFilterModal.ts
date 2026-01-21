import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SpamFilterModalSelectorText } from '../../locators/Browser/SpamFilterModal.selectors';

class SpamFilterModal {
  get title(): DetoxElement {
    return Matchers.getElementByText(SpamFilterModalSelectorText.TITLE);
  }

  get cancelButtonText(): DetoxElement {
    return Matchers.getElementByText(SpamFilterModalSelectorText.CANCEL_BUTTON);
  }

  async tapCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButtonText, {
      elemDescription: 'Tap on the close button',
    });
  }
}

export default new SpamFilterModal();
