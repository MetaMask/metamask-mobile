import Matchers from '../../../utils/Matchers';
import { AlertModalSelectorsIDs, AlertModalSelectorsText, ConfirmAlertModalSelectorsIDs, ConfirmationPageSectionsSelectorIDs, ConfirmationTopSheetSelectorsIDs, ConfirmationTopSheetSelectorsText } from '../../../selectors/Confirmation/ConfirmationView.selectors';
import Gestures from '../../../utils/Gestures';

class AlertSystem {
  get securityAlertBanner() {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER_REDESIGNED,
    );
  }

  get securityAlertResponseFailedBanner() {
    return Matchers.getElementByText(ConfirmationTopSheetSelectorsText.BANNER_FAILED_TITLE) && Matchers.getElementByText(ConfirmationTopSheetSelectorsText.BANNER_FAILED_DESCRIPTION);
  }

  get securityAlertResponseMaliciousBanner() {
    return Matchers.getElementByText(ConfirmationTopSheetSelectorsText.BANNER_MALICIOUS_TITLE) && Matchers.getElementByText(ConfirmationTopSheetSelectorsText.BANNER_MALICIOUS_DESCRIPTION);
  }

  get inlineAlert() {
    return Matchers.getElementByID(ConfirmationPageSectionsSelectorIDs.INLINE_ALERT);
  }

  get alertMismatchTitle() {
    return Matchers.getElementByText(AlertModalSelectorsText.ALERT_ORIGIN_MISMATCH_TITLE);
  }

  get acknowledgeAlertModal() {
    return Matchers.getElementByID(
      AlertModalSelectorsIDs.ALERT_MODAL_CHECKBOX,
    );
  }

  get gotItAlertModalButton() {
    return Matchers.getElementByID(
      AlertModalSelectorsIDs.ALERT_MODAL_GOT_IT_BUTTON,
    );
  }

  get confirmAlertModal() {
    return Matchers.getElementByID(
      ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_MODAL,
    );
  }

  get confirmAlertModalButton() {
    return Matchers.getElementByID(
      ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_BUTTON,
    );
  }

  get acknowledgeConfirmAlertModal() {
    return Matchers.getElementByID(
      ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CHECKBOX,
    );
  }

  async tapConfirmAlertCheckbox() {
    await Gestures.waitAndTap(this.acknowledgeConfirmAlertModal);
  }

  async tapConfirmAlertButton() {
    await Gestures.waitAndTap(this.confirmAlertModalButton);
  }

  async tapInlineAlert() {
    await Gestures.waitAndTap(this.inlineAlert);
  }

  async tapGotItAlertModalButton() {
    await Gestures.waitAndTap(this.gotItAlertModalButton);
  }

  async tapAcknowledgeAlertModal() {
    await Gestures.waitAndTap(this.acknowledgeAlertModal);
  }
}

export default new AlertSystem();
