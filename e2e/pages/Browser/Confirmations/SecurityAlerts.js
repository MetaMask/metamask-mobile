import Matchers from '../../../utils/Matchers';
import { ConfirmationTopSheetSelectorsIDs, ConfirmationTopSheetSelectorsText } from '../../../selectors/Confirmation/ConfirmationView.selectors';

class SecurityAlerts {
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
}

export default new SecurityAlerts();
