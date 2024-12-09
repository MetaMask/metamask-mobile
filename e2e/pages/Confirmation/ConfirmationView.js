import { ConfirmationTopSheetSelectorsIDs } from '../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../utils/Matchers';

class ConfirmationView {
  get securityAlertBanner() {
    return Matchers.getElementByID(ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER);
  }

  get securityAlertResponseFailedBanner() {
    return Matchers.getElementByID(ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER);
  }

}

export default new ConfirmationView();
