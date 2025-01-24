import {
  ImportTokenViewSelectorsIDs,
  ImportTokenViewSelectorsText
} from '../../../selectors/wallet/ImportTokenView.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class ConfirmAddAssetView {
  get container() {
    return Matchers.getElementByID(ImportTokenViewSelectorsIDs.ADD_CONFIRM_CUSTOM_ASSET);
  }

  get cancelButton() {
    return Matchers.getElementByText(ImportTokenViewSelectorsText.CANCEL_IMPORT_TOKEN);
  }

  get confirmButton() {
    return Matchers.getElementByText(ImportTokenViewSelectorsText.CONFIRM_IMPORT_TOKEN);
  }

  get cancelModal() {
    return Matchers.getElementByID(ImportTokenViewSelectorsIDs.ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL);
  }

  get confirmButtonModal() {
    return Matchers.getElementByText(ImportTokenViewSelectorsText.CONFIRM_CANCEL_IMPORT_TOKEN);
  }

  async tapOnCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapOnConfirmButton() {
    await Gestures.waitAndTap(this.confirmButton);
  }

  async tapOnConfirmModalButton() {
    await Gestures.waitAndTap(this.confirmButtonModal);
  }
}

export default new ConfirmAddAssetView();
