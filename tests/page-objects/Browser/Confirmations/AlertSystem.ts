import Matchers from '../../../framework/Matchers';
import {
  AlertModalSelectorsIDs,
  AlertModalSelectorsText,
  ConfirmAlertModalSelectorsIDs,
  ConfirmationTopSheetSelectorsIDs,
  ConfirmationTopSheetSelectorsText,
  AlertTypeIDs,
} from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Gestures from '../../../framework/Gestures';
import { EncapsulatedElementType } from '../../../framework';

class AlertSystem {
  get securityAlertBanner(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER_REDESIGNED,
    );
  }

  get securityAlertResponseFailedBanner(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ConfirmationTopSheetSelectorsText.BANNER_FAILED_TITLE,
    );
  }

  get securityAlertResponseMaliciousBanner(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ConfirmationTopSheetSelectorsText.BANNER_MALICIOUS_TITLE,
    );
  }

  get inlineAlert(): EncapsulatedElementType {
    return Matchers.getElementByID(AlertTypeIDs.INLINE_ALERT);
  }

  get alertMismatchTitle(): EncapsulatedElementType {
    return Matchers.getElementByText(
      AlertModalSelectorsText.ALERT_ORIGIN_MISMATCH_TITLE,
    );
  }

  get acknowledgeAlertModal(): EncapsulatedElementType {
    return Matchers.getElementByID(AlertModalSelectorsIDs.ALERT_MODAL_CHECKBOX);
  }

  get acknowledgeAlertModalButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      AlertModalSelectorsIDs.ALERT_MODAL_ACKNOWLEDGE_BUTTON,
    );
  }

  get confirmAlertModal(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_MODAL,
    );
  }

  get confirmAlertModalButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_BUTTON,
    );
  }

  get acknowledgeConfirmAlertModal(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CHECKBOX,
    );
  }

  async tapConfirmAlertCheckbox(): Promise<void> {
    await Gestures.waitAndTap(this.acknowledgeConfirmAlertModal, {
      elemDescription: 'Confirm alert checkbox',
    });
  }

  async tapConfirmAlertButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmAlertModalButton, {
      elemDescription: 'Confirm alert button',
    });
  }

  async tapInlineAlert(): Promise<void> {
    await Gestures.waitAndTap(this.inlineAlert, {
      elemDescription: 'Inline alert',
    });
  }

  async tapAcknowledgeAlertModalButton(): Promise<void> {
    await Gestures.waitAndTap(this.acknowledgeAlertModalButton, {
      elemDescription: 'Acknowledge alert modal button',
    });
  }

  async tapAcknowledgeAlertModal(): Promise<void> {
    await Gestures.waitAndTap(this.acknowledgeAlertModal, {
      elemDescription: 'Acknowledge alert modal',
    });
  }
}

export default new AlertSystem();
