import { AdvancedViewSelectorsIDs } from '../../selectors/Settings/AdvancedView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class AdvancedSettingsView {
  get scrollViewIdentifier() {
    return Matchers.getIdentifier(
      AdvancedViewSelectorsIDs.ADVANCED_SETTINGS_SCROLLVIEW,
    );
  }

  get showFiatOnTestnetsToggle() {
    return Matchers.getElementByID(
      AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS,
    );
  }

  async tapShowFiatOnTestnetsSwitch() {
    await Gestures.waitAndTap(this.showFiatOnTestnetsToggle);
  }

  async scrollToShowFiatOnTestnetsToggle() {
    await Gestures.scrollToElement(
      this.showFiatOnTestnetsToggle,
      this.scrollViewIdentifier,
    );
  }
}

export default new AdvancedSettingsView();
