import Matchers from '../../../utils/Matchers';
import { ConfirmationTopSheetSelectorsIDs } from '../../../selectors/Confirmation/ConfirmationView.selectors';

class SecurityAlerts {
  get securityAlertBanner() {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER,
    );
  }

  get securityAlertResponseFailedBanner() {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER,
    );
  }
}

export default new SecurityAlerts();
