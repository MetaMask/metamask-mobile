import { AdvancedViewSelectorsIDs } from '../../selectors/Settings/AdvancedView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class AdvancedSettingsView {
  async tapEthSignSwitch() {
    if (device.getPlatform() === 'android') {
      await Gestures.swipe(
        Matchers.getElementByLabel('Show Hex Data'),
        'up',
        'slow',
        0.5
      );
      await Gestures.waitAndTap(
        Matchers.getElementByID(AdvancedViewSelectorsIDs.ETH_SIGN_SWITCH)
      );
    } else {
      await Gestures.swipe(
        Matchers.getElementByID(AdvancedViewSelectorsIDs.CONTAINER),
        'up',
        'slow',
        0.2
      );
      await Gestures.waitAndTap(
        Matchers.getElementByID(AdvancedViewSelectorsIDs.ETH_SIGN_SWITCH)
      );
    }
  }

  get scrollViewIdentifier() {
    return Matchers.getIdentifier(
      AdvancedViewSelectorsIDs.ADVANCED_SETTINGS_SCROLLVIEW
    );
  }

  get showFiatOnTestnetsToggle() {
    return Matchers.getElementByID(
      AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS
    );
  }

  get ethSignSwitch() {
    return Matchers.getElementByID(AdvancedViewSelectorsIDs.ETH_SIGN_SWITCH);
  }

  async tapShowFiatOnTestnetsSwitch() {
    await Gestures.waitAndTap(
      this.showFiatOnTestnetsToggle
    );
  }

  async scrollToShowFiatOnTestnetsToggle() {
    await Gestures.scrollToElement(
      this.showFiatOnTestnetsToggle,
      this.scrollViewIdentifier
    );
  }
}

export default new AdvancedSettingsView();
