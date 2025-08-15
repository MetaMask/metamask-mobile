import { ConfirmationTopSheetSelectorsIDs } from '../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../framework/Matchers';

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
