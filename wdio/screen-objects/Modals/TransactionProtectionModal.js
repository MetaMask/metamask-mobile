import {
  TransactionProtectionModalSelectorText
} from '../../../e2e/selectors/Modals/TransactionProtectionModal.selectors';
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

class TransactionProtectionModal {
  get header() {
    return Selectors.getXpathElementByText(
      TransactionProtectionModalSelectorText.HEADER,
    );
  }

  get enableButton() {
    return Selectors.getXpathElementByText(
      TransactionProtectionModalSelectorText.ENABLE_BUTTON,
    );
  }

  async isVisible() {
    await expect(this.header).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.header).not.toBeDisplayed();
  }

  async tapEnableButton() {
    await Gestures.waitAndTap(this.enableButton);
  }
}

export default new TransactionProtectionModal();
