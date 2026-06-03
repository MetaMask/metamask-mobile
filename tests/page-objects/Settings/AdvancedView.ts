import {
  AdvancedViewSelectorsIDs,
  AdvancedViewSelectorsText,
} from '../../../app/components/Views/Settings/AdvancedSettings/AdvancedView.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AdvancedSettingsView {
  get scrollViewIdentifier(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(
      AdvancedViewSelectorsIDs.ADVANCED_SETTINGS_SCROLLVIEW,
    );
  }

  get showFiatOnTestnetsToggle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AdvancedViewSelectorsIDs.SHOW_FIAT_ON_TESTNETS,
        ),
    });
  }

  get smartTransactionsToggle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AdvancedViewSelectorsIDs.STX_OPT_IN_SWITCH),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AdvancedViewSelectorsIDs.STX_OPT_IN_SWITCH,
        ),
    });
  }

  get resetAccountButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(AdvancedViewSelectorsText.RESET_ACCOUNT, 1),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          AdvancedViewSelectorsText.RESET_ACCOUNT,
        ),
    });
  }

  get resetConfirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AdvancedViewSelectorsIDs.RESET_ACCOUNT_CONFIRM_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AdvancedViewSelectorsIDs.RESET_ACCOUNT_CONFIRM_BUTTON,
        ),
    });
  }

  async tapShowFiatOnTestnetsSwitch(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.showFiatOnTestnetsToggle, {
      elemDescription: 'Show Fiat on Testnets Toggle in Advanced Settings',
    });
  }

  async tapSmartTransactionSwitch(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.smartTransactionsToggle, {
      elemDescription: 'Smart Transactions Toggle in Advanced Settings',
    });
  }

  async scrollToShowFiatOnTestnetsToggle(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.showFiatOnTestnetsToggle,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Scroll to Show Fiat on Testnets Toggle',
      },
    );
  }

  async tapResetAccountButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.resetAccountButton, {
      elemDescription: 'Smart Transactions Reset Account Button',
    });
  }

  async tapConfirmResetButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.resetConfirmButton, {
      elemDescription: 'Smart Transactions Confirm Reset Button',
    });
  }
}

export default new AdvancedSettingsView();
