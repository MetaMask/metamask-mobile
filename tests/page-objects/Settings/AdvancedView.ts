import {
  AdvancedViewSelectorsIDs,
  AdvancedViewSelectorsText,
} from '../../../app/components/Views/Settings/AdvancedSettings/AdvancedView.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { EncapsulatedElementType } from '../../framework';

class AdvancedSettingsView {
  get scrollViewIdentifier(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(
      AdvancedViewSelectorsIDs.ADVANCED_SETTINGS_SCROLLVIEW,
    );
  }

  get showFiatOnTestnetsToggle(): EncapsulatedElementType {
    return Matchers.getElementByID(
      AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS,
    );
  }

  get smartTransactionsToggle(): EncapsulatedElementType {
    return Matchers.getElementByID(AdvancedViewSelectorsIDs.STX_OPT_IN_SWITCH);
  }

  get resetAccountButton(): EncapsulatedElementType {
    return Matchers.getElementByText(
      AdvancedViewSelectorsText.RESET_ACCOUNT,
      1,
    );
  }

  get resetConfirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      AdvancedViewSelectorsIDs.RESET_ACCOUNT_CONFIRM_BUTTON,
    );
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

  async tapResetAccountButton(): Promise<void> {
    await Gestures.waitAndTap(this.resetAccountButton, {
      elemDescription: 'Smart Transactions Reset Account Button',
    });
  }

  async tapConfirmResetButton(): Promise<void> {
    await Gestures.waitAndTap(this.resetConfirmButton, {
      elemDescription: 'Smart Transactions Confirm Reset Button',
    });
  }
}

export default new AdvancedSettingsView();
