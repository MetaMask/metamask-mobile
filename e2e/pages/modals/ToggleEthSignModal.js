import TestHelpers from '../../helpers';
import { TOGGLE_ETH_SIGN_MODAL } from '../../../wdio/screen-objects/testIDs/Components/ToggleEthSignModal.testIds';

export default class ToggleEthSignModal {
  static async isVisible() {
    await TestHelpers.checkIfVisible(TOGGLE_ETH_SIGN_MODAL);
  }
}
