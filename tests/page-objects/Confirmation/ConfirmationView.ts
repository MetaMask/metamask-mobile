import { ConfirmationTopSheetSelectorsIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class ConfirmationView {
  get securityAlertBanner(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER,
        ),
    });
  }

  get securityAlertResponseFailedBanner(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER,
        ),
    });
  }
}

export default new ConfirmationView();
