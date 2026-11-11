import { ConfirmationTopSheetSelectorsIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../framework/Matchers';
import { type AppiumElement } from '../../framework';

class ConfirmationView {
  get securityAlertBanner(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER,
    );
  }

  get securityAlertResponseFailedBanner(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER,
    );
  }
}

export default new ConfirmationView();
