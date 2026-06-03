import {
  ClearPrivacyModalSelectorsIDs,
  ClearPrivacyModalSelectorsText,
} from '../../../../app/components/Views/Settings/SecuritySettings/Sections/ClearPrivacy/ClearPrivacyModal.testIds';
import Matchers from '../../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class ClearPrivacyModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ClearPrivacyModalSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ClearPrivacyModalSelectorsIDs.CONTAINER,
        ),
    });
  }

  get clearButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(ClearPrivacyModalSelectorsText.CLEAR_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ClearPrivacyModalSelectorsText.CLEAR_BUTTON,
        ),
    });
  }
  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(ClearPrivacyModalSelectorsText.CANCEL_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ClearPrivacyModalSelectorsText.CANCEL_BUTTON,
        ),
    });
  }

  async tapClearButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.clearButton, {
      elemDescription: 'Clear Button in Clear Privacy Modal',
    });
  }
}

export default new ClearPrivacyModal();
