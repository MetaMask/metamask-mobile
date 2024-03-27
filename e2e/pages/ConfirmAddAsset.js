import TestHelpers from '../helpers';
import {
  ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL,
  ADD_CONFIRM_CUSTOM_ASSET,
} from '../../wdio/screen-objects/testIDs/Screens/AddCustomToken.testIds';

import { ImportTokenViewSelectorsText } from '../selectors/ImportTokenView.selectors';

export default class ConfirmAddAssetView {
  static async tapOnCancelButton() {
    await TestHelpers.tapByText(
      ImportTokenViewSelectorsText.CANCEL_IMPORT_TOKEN,
    );
  }

  static async tapOnConfirmButton() {
    await TestHelpers.tapByText(
      ImportTokenViewSelectorsText.CONFIRM_IMPORT_TOKEN,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ADD_CONFIRM_CUSTOM_ASSET);
  }

  static async cancelModalIsVisible() {
    await TestHelpers.checkIfVisible(ADD_CANCEL_ADD_CUSTOM_ASSET_MODAL);
  }
}
