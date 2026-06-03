import Matchers from '../../../framework/Matchers';
import {
  AlertModalSelectorsIDs,
  AlertModalSelectorsText,
  ConfirmAlertModalSelectorsIDs,
  ConfirmationTopSheetSelectorsIDs,
  ConfirmationTopSheetSelectorsText,
  AlertTypeIDs,
} from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class AlertSystem {
  get securityAlertBanner(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER_REDESIGNED,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER_REDESIGNED,
        ),
    });
  }

  get securityAlertResponseFailedBanner(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ConfirmationTopSheetSelectorsText.BANNER_FAILED_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ConfirmationTopSheetSelectorsText.BANNER_FAILED_TITLE,
        ),
    });
  }

  get securityAlertResponseMaliciousBanner(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ConfirmationTopSheetSelectorsText.BANNER_MALICIOUS_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ConfirmationTopSheetSelectorsText.BANNER_MALICIOUS_TITLE,
        ),
    });
  }

  get inlineAlert(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AlertTypeIDs.INLINE_ALERT),
      appium: () =>
        PlaywrightMatchers.getElementById(AlertTypeIDs.INLINE_ALERT),
    });
  }

  get alertMismatchTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          AlertModalSelectorsText.ALERT_ORIGIN_MISMATCH_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          AlertModalSelectorsText.ALERT_ORIGIN_MISMATCH_TITLE,
        ),
    });
  }

  get acknowledgeAlertModal(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AlertModalSelectorsIDs.ALERT_MODAL_CHECKBOX),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AlertModalSelectorsIDs.ALERT_MODAL_CHECKBOX,
        ),
    });
  }

  get acknowledgeAlertModalButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AlertModalSelectorsIDs.ALERT_MODAL_ACKNOWLEDGE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AlertModalSelectorsIDs.ALERT_MODAL_ACKNOWLEDGE_BUTTON,
        ),
    });
  }

  get confirmAlertModal(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_MODAL,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_MODAL,
        ),
    });
  }

  get confirmAlertModalButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_BUTTON,
        ),
    });
  }

  get acknowledgeConfirmAlertModal(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CHECKBOX,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CHECKBOX,
        ),
    });
  }

  async tapConfirmAlertCheckbox(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.acknowledgeConfirmAlertModal, {
      elemDescription: 'Confirm alert checkbox',
    });
  }

  async tapConfirmAlertButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmAlertModalButton, {
      elemDescription: 'Confirm alert button',
    });
  }

  async tapInlineAlert(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.inlineAlert, {
      elemDescription: 'Inline alert',
    });
  }

  async tapAcknowledgeAlertModalButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.acknowledgeAlertModalButton, {
      elemDescription: 'Acknowledge alert modal button',
    });
  }

  async tapAcknowledgeAlertModal(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.acknowledgeAlertModal, {
      elemDescription: 'Acknowledge alert modal',
    });
  }
}

export default new AlertSystem();
