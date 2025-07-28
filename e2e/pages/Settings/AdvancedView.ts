import { AdvancedViewSelectorsIDs } from '../../selectors/Settings/AdvancedView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class AdvancedSettingsView {
  get scrollViewIdentifier(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(
      AdvancedViewSelectorsIDs.ADVANCED_SETTINGS_SCROLLVIEW,
    );
  }

  get showFiatOnTestnetsToggle(): DetoxElement {
    return Matchers.getElementByID(
      AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS,
    );
  }

  get smartTransactionsToggle(): DetoxElement {
    return Matchers.getElementByID(AdvancedViewSelectorsIDs.STX_OPT_IN_SWITCH);
  }

  async tapShowFiatOnTestnetsSwitch(): Promise<void> {
    await Gestures.waitAndTap(this.showFiatOnTestnetsToggle, {
      elemDescription: 'Show Fiat on Testnets Toggle in Advanced Settings',
    });
  }

  async tapSmartTransactionSwitch(): Promise<void> {
    await Gestures.waitAndTap(this.smartTransactionsToggle, {
      elemDescription: 'Smart Transactions Toggle in Advanced Settings',
    });
  }

  async scrollToShowFiatOnTestnetsToggle(): Promise<void> {
    await Gestures.scrollToElement(
      this.showFiatOnTestnetsToggle,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Scroll to Show Fiat on Testnets Toggle',
      },
    );
  }
}

export default new AdvancedSettingsView();
