import { AdvancedViewSelectorsIDs } from '../../selectors/Settings/AdvancedView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class AdvancedSettingsView {
  async tapEthSignSwitch() {
    // Add delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Scroll to the element
    await Gestures.scrollToElement(
      this.ethSignSwitch,
      this.scrollViewIdentifier
    );

    // Wait and tap the element
    await Gestures.waitAndTap(this.ethSignSwitch);
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
