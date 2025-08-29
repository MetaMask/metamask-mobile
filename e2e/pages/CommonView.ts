import Matchers from '../framework/Matchers';
import Gestures from '../framework/Gestures';
import {
  CommonSelectorsIDs,
  CommonSelectorsText,
} from '../selectors/Common.selectors';

class CommonView {
  get okAlertByText(): DetoxElement {
    return Matchers.getElementByText('OK');
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  get errorMessage(): DetoxElement {
    return Matchers.getElementByID(CommonSelectorsIDs.ERROR_MESSAGE);
  }

  get okAlertButton(): DetoxElement {
    return Matchers.getElementByText(CommonSelectorsText.OK_ALERT_BUTTON);
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button',
    });
  }

  async tapOkAlert(): Promise<void> {
    await Gestures.waitAndTap(this.okAlertByText, {
      elemDescription: 'OK Alert',
    });
  }

  async tapOKAlertButton(): Promise<void> {
    await Gestures.waitAndTap(this.okAlertButton, {
      elemDescription: 'OK Alert Button',
    });
  }
}

export default new CommonView();
