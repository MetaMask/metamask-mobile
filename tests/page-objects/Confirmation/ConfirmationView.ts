import { ConfirmationTopSheetSelectorsIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds.ts';
import Matchers from '../../framework/Matchers.ts';

class ConfirmationView {
  get securityAlertBanner(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER,
    );
  }

  get securityAlertResponseFailedBanner(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER,
    );
  }
}

export default new ConfirmationView();
