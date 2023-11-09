import TestHelpers from '../helpers';
import { CUSTOM_TOKEN_CONTAINER_ID } from '../../wdio/screen-objects/testIDs/Screens/AddCustomToken.testIds';

export default class ImportTokensView {
  static async isVisible() {
    await TestHelpers.checkIfVisible(CUSTOM_TOKEN_CONTAINER_ID);
  }
}
