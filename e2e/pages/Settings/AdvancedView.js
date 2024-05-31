import TestHelpers from '../../helpers';
import { AdvancedViewSelectorsIDs } from '../../selectors/Settings/AdvancedView.selectors';

export default class AdvancedSettingsView {
  static async tapEthSignSwitch() {
    await TestHelpers.delay(2500);

    if (device.getPlatform() === 'android') {
      await TestHelpers.swipeByLabel('Show Hex Data', 'up', 'slow', 0.5);
      await TestHelpers.delay(2500);

      await TestHelpers.waitAndTap(AdvancedViewSelectorsIDs.ETH_SIGN_SWITCH);
    } else {
      await TestHelpers.swipe(
        AdvancedViewSelectorsIDs.CONTAINER,
        'up',
        'slow',
        0.2,
      );
      await TestHelpers.waitAndTap(AdvancedViewSelectorsIDs.ETH_SIGN_SWITCH);
    }
  }

  static async tapShowFiatOnTestnetsSwitch() {
    await TestHelpers.waitAndTap(
      AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS,
    );
  }
}
