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

  get smartTransactionsToggle() {
    return Matchers.getElementByID(
      AdvancedViewSelectorsIDs.STX_OPT_IN_SWITCH,
    );
  }

  async tapShowFiatOnTestnetsSwitch() {
    await Gestures.waitAndTap(this.showFiatOnTestnetsToggle);
  }

  async tapSmartTransactionSwitch() {
    await Gestures.waitAndTap(this.smartTransactionsToggle);
  }

  async scrollToShowFiatOnTestnetsToggle() {
    await Gestures.scrollToElement(
      this.showFiatOnTestnetsToggle,
      this.scrollViewIdentifier,
    );
  }
}

export default new AdvancedSettingsView();
