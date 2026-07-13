import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SpamFilterModalSelectorText } from '../../selectors/Browser/SpamFilterModal.selectors';
import { EncapsulatedElementType } from '../../framework';

class SpamFilterModal {
  get title(): EncapsulatedElementType {
    return Matchers.getElementByText(SpamFilterModalSelectorText.TITLE);
  }

  get cancelButtonText(): EncapsulatedElementType {
    return Matchers.getElementByText(SpamFilterModalSelectorText.CANCEL_BUTTON);
  }

  async tapCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButtonText, {
      elemDescription: 'Tap on the close button',
    });
  }
}

export default new SpamFilterModal();
