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
import { type AppiumElement } from '../../../framework';

class AlertSystem {
  get securityAlertBanner(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER_REDESIGNED,
    );
  }

  get securityAlertResponseFailedBanner(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ConfirmationTopSheetSelectorsText.BANNER_FAILED_TITLE,
    );
  }

  get securityAlertResponseMaliciousBanner(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ConfirmationTopSheetSelectorsText.BANNER_MALICIOUS_TITLE,
    );
  }

  get inlineAlert(): Promise<AppiumElement> {
    return Matchers.getElementByID(AlertTypeIDs.INLINE_ALERT);
  }

  get alertMismatchTitle(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      AlertModalSelectorsText.ALERT_ORIGIN_MISMATCH_TITLE,
    );
  }

  get acknowledgeAlertModal(): Promise<AppiumElement> {
    return Matchers.getElementByID(AlertModalSelectorsIDs.ALERT_MODAL_CHECKBOX);
  }

  get acknowledgeAlertModalButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AlertModalSelectorsIDs.ALERT_MODAL_ACKNOWLEDGE_BUTTON,
    );
  }

  get confirmAlertModal(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_MODAL,
    );
  }

  get confirmAlertModalButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_BUTTON,
    );
  }

  get acknowledgeConfirmAlertModal(): Promise<AppiumElement> {
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
