import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';
import { ConfirmAddAssetSelectorsIDs, ConfirmAddAssetSelectorsText } from './ConfirmAddAsset.selectors';

class ConfirmAddAssetView {
  get cancelButton() {
    return Matchers.getElementByText(ConfirmAddAssetSelectorsText.CANCEL_IMPORT_TOKEN);
  }

  get confirmButton() {
    return Matchers.getElementByText(ConfirmAddAssetSelectorsText.CONFIRM_IMPORT_TOKEN);
  }

  get confirmCustomAsset() {
    return Matchers.getElementByID(ConfirmAddAssetSelectorsIDs.ADD_CONFIRM_CUSTOM_ASSET);
  }

  get cancelAddCustomAssetModal() {
    return Matchers.getElementByID(ConfirmAddAssetSelectorsIDs.ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL);
  }

  get confirmModalButton() {
    return Matchers.getElementByText(ConfirmAddAssetSelectorsText.CONFIRM_CANCEL_IMPORT_TOKEN);
  }

  async tapOnCancelButton() {
    await Gestures.tap(this.cancelButton);
  }

  async tapOnConfirmButton() {
    await Gestures.tap(this.confirmButton);
  }

  async isVisible() {
    await Matchers.checkIfVisible(this.confirmCustomAsset);
  }

  async cancelModalIsVisible() {
    await Matchers.checkIfVisible(this.cancelAddCustomAssetModal);
  }

  async tapOnConfirmModalButton() {
    await Gestures.tap(this.confirmModalButton);
  }
}

export default new ConfirmAddAssetView();
