import TestHelpers from '../helpers';
import { CUSTOM_TOKEN_CONTAINER_ID } from '../../wdio/screen-objects/testIDs/Screens/AddCustomToken.testIds';
import {
  ASSET_BACK_BUTTON,
  TOKEN_RESULTS_LIST_ID,
  TOKEN_INPUT_BOX_ID,
} from '../../wdio/screen-objects/testIDs/Screens/AssetSearch.testIds';
import { ImportTokenViewSelectorsText } from '../selectors/ImportTokenView.selectors';

export default class ImportTokensView {
  static async tapImportButton() {
    await TestHelpers.swipe(TOKEN_INPUT_BOX_ID, 'up', 'fast');

    await TestHelpers.tapByText(ImportTokenViewSelectorsText.IMPORT_BUTTON);
  }
  static async tapBackButton() {
    await TestHelpers.tap(ASSET_BACK_BUTTON);
  }

  static async typeInTokenName(tokenName) {
    await TestHelpers.checkIfExists(TOKEN_INPUT_BOX_ID);

    await TestHelpers.typeTextAndHideKeyboard(TOKEN_INPUT_BOX_ID, tokenName);
  }
  static async tapOnToken() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.tapItemAtIndexByLabel(TOKEN_RESULTS_LIST_ID);
    } else {
      await TestHelpers.tapItemAtIndex(TOKEN_RESULTS_LIST_ID);
    }
  }

  static async tapOnCancelButton() {
    await TestHelpers.tapByText(ImportTokenViewSelectorsText.CANCEL_BUTTON);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(CUSTOM_TOKEN_CONTAINER_ID);
  }
}
