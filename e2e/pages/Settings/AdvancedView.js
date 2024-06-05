import TestHelpers from '../../helpers';
import { AdvancedViewSelectorsIDs } from '../../selectors/Settings/AdvancedView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

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

  static get scrollViewIdentifier() {
    return Matchers.getIdentifier(
      AdvancedViewSelectorsIDs.ADVANCED_SETTINGS_SCROLLVIEW,
    );
  }

  static get showFiatOnTestnetsToggle() {
    return Matchers.getElementByID(
      AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS,
    );
  }

  static async tapShowFiatOnTestnetsSwitch() {
    await TestHelpers.waitAndTap(
      AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS,
    );
  }

  static async scrollToShowFiatOnTestnetsToggle() {
    await Gestures.scrollToElement(
      this.showFiatOnTestnetsToggle,
      this.scrollViewIdentifier,
    );
  }
}
