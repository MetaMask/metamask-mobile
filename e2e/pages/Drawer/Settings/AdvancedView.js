import {
  ADVANCED_SETTINGS_CONTAINER_ID,
  ETH_SIGN_SWITCH_ID,
} from '../../../../app/constants/test-ids';
import TestHelpers from '../../../helpers';

export default class AdvancedSettingsView {
  static async tapEthSignSwitch() {
    await TestHelpers.swipe(ADVANCED_SETTINGS_CONTAINER_ID, 'up', 'slow', 0.2);
    await TestHelpers.tap(ETH_SIGN_SWITCH_ID);
  }
}
