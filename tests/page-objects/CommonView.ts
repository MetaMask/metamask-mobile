import Matchers from '../framework/Matchers';
import {
  CommonSelectorsIDs,
  CommonSelectorsText,
} from '../../app/util/Common.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../framework/EncapsulatedElement';
import PlaywrightMatchers from '../framework/PlaywrightMatchers';
import UnifiedGestures from '../framework/UnifiedGestures';

class CommonView {
  get okAlertByText(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('OK'),
      appium: () => PlaywrightMatchers.getElementByText('OK'),
    });
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(CommonSelectorsIDs.BACK_ARROW_BUTTON),
    });
  }

  get errorMessage(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(CommonSelectorsIDs.ERROR_MESSAGE),
      appium: () =>
        PlaywrightMatchers.getElementById(CommonSelectorsIDs.ERROR_MESSAGE),
    });
  }

  get okAlertButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(CommonSelectorsText.OK_ALERT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          CommonSelectorsText.OK_ALERT_BUTTON,
        ),
    });
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button',
    });
  }

  async tapOkAlert(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.okAlertByText, {
      elemDescription: 'OK Alert',
    });
  }

  async tapOKAlertButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.okAlertButton, {
      elemDescription: 'OK Alert Button',
    });
  }
}

export default new CommonView();
