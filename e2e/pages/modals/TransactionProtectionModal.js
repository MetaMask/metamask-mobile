import { TransactionProtectionModalSelectorText } from '../../selectors/Modals/TransactionProtectionModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class TransactionProtectionModal {
  get header() {
    return Matchers.getElementByText(
      TransactionProtectionModalSelectorText.HEADER,
    );
  }

  get enableButton() {
    return Matchers.getElementByText(
      TransactionProtectionModalSelectorText.ENABLE_BUTTON,
    );
  }

  async tapEnableButton() {
    await Gestures.waitAndTap(this.enableButton);
  }
}

export default new TransactionProtectionModal();
