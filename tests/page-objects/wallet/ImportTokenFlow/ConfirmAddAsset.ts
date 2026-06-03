import {
  ImportTokenViewSelectorsIDs,
  ImportTokenViewSelectorsText,
} from '../../../../app/components/Views/AddAsset/ImportAssetView.testIds';
import Matchers from '../../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class ConfirmAddAssetView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ImportTokenViewSelectorsIDs.ADD_CONFIRM_CUSTOM_ASSET,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportTokenViewSelectorsIDs.ADD_CONFIRM_CUSTOM_ASSET,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ImportTokenViewSelectorsText.CANCEL_IMPORT_TOKEN,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ImportTokenViewSelectorsText.CANCEL_IMPORT_TOKEN,
        ),
    });
  }

  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ImportTokenViewSelectorsIDs.BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportTokenViewSelectorsIDs.BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT,
        ),
    });
  }

  get cancelModal(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ImportTokenViewSelectorsIDs.ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportTokenViewSelectorsIDs.ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL,
        ),
    });
  }

  get confirmButtonModal(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ImportTokenViewSelectorsText.CONFIRM_CANCEL_IMPORT_TOKEN,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ImportTokenViewSelectorsText.CONFIRM_CANCEL_IMPORT_TOKEN,
        ),
    });
  }

  async tapOnCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Add Asset Button',
    });
  }

  async tapOnConfirmButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Add Asset Button',
      waitForElementToDisappear: true,
      timeout: 15000,
    });
  }

  async tapOnConfirmModalButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButtonModal, {
      elemDescription: 'Confirm Add Asset Modal Button',
    });
  }
}

export default new ConfirmAddAssetView();
