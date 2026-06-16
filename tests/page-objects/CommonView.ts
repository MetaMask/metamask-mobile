import Matchers from '../framework/Matchers';
import Gestures from '../framework/Gestures';
import {
  CommonSelectorsIDs,
  CommonSelectorsText,
} from '../../app/util/Common.testIds';
import { EncapsulatedElementType } from '../framework';

class CommonView {
  get okAlertByText(): EncapsulatedElementType {
    return Matchers.getElementByText('OK');
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  get errorMessage(): EncapsulatedElementType {
    return Matchers.getElementByID(CommonSelectorsIDs.ERROR_MESSAGE);
  }

  get okAlertButton(): EncapsulatedElementType {
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
