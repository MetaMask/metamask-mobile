import {
  ClearPrivacyModalSelectorsIDs,
  ClearPrivacyModalSelectorsText,
} from '../../../../app/components/Views/Settings/SecuritySettings/Sections/ClearPrivacy/ClearPrivacyModal.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';

class ClearPrivacyModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(ClearPrivacyModalSelectorsIDs.CONTAINER);
  }

  get clearButton(): DetoxElement {
    return Matchers.getElementByText(
      ClearPrivacyModalSelectorsText.CLEAR_BUTTON,
    );
  }
  get cancelButton(): DetoxElement {
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
