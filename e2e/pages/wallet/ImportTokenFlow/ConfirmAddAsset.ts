import {
  ImportTokenViewSelectorsIDs,
  ImportTokenViewSelectorsText,
} from '../../../selectors/wallet/ImportTokenView.selectors';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT } from '../../../../app/component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.constants';

class ConfirmAddAssetView {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      ImportTokenViewSelectorsIDs.ADD_CONFIRM_CUSTOM_ASSET,
    );
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByText(
      ImportTokenViewSelectorsText.CANCEL_IMPORT_TOKEN,
    );
  }

  get confirmButton(): DetoxElement {
    return Matchers.getElementByID(TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT);
  }

  get cancelModal(): DetoxElement {
    return Matchers.getElementByID(
      ImportTokenViewSelectorsIDs.ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL,
    );
  }

  get confirmButtonModal(): DetoxElement {
    return Matchers.getElementByText(
      ImportTokenViewSelectorsText.CONFIRM_CANCEL_IMPORT_TOKEN,
    );
  }

  async tapOnCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Add Asset Button',
    });
  }

  async tapOnConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Add Asset Button',
      waitForElementToDisappear: true,
      timeout: 15000,
    });
  }

  async tapOnConfirmModalButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButtonModal, {
      elemDescription: 'Confirm Add Asset Modal Button',
    });
  }
}

export default new ConfirmAddAssetView();
