import {
  ClearPrivacyModalSelectorsIDs,
  ClearPrivacyModalSelectorsText,
} from '../../../../app/components/Views/Settings/SecuritySettings/Sections/ClearPrivacy/ClearPrivacyModal.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { type AppiumElement } from '../../../framework';

class ClearPrivacyModal {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(ClearPrivacyModalSelectorsIDs.CONTAINER);
  }

  get clearButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ClearPrivacyModalSelectorsText.CLEAR_BUTTON,
    );
  }
  get cancelButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ClearPrivacyModalSelectorsText.CANCEL_BUTTON,
    );
  }

  async tapClearButton(): Promise<void> {
    await Gestures.waitAndTap(this.clearButton, {
      elemDescription: 'Clear Button in Clear Privacy Modal',
    });
  }
}

export default new ClearPrivacyModal();
