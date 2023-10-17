import {
  ADVANCED_SETTINGS_CONTAINER_ID,
  ETH_SIGN_SWITCH_ID,
} from '../../../../app/constants/test-ids';
import TestHelpers from '../../../helpers';

export default class AdvancedSettingsView {
  static async tapEthSignSwitch() {
    await TestHelpers.delay(2500);

    if (device.getPlatform() === 'android') {
      await TestHelpers.swipeByLabel('Show Hex Data', 'up', 'slow', 0.5);
      await TestHelpers.delay(2500);

      await TestHelpers.waitAndTap(ETH_SIGN_SWITCH_ID);
    } else {
      await TestHelpers.swipe(
        ADVANCED_SETTINGS_CONTAINER_ID,
        'up',
        'slow',
        0.2,
      );
      await TestHelpers.waitAndTap(ETH_SIGN_SWITCH_ID);
    }
  }
}
