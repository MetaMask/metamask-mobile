import { ConfirmationTopSheetSelectorsIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../framework/Matchers';
import { EncapsulatedElementType } from '../../framework';

class ConfirmationView {
  get securityAlertBanner(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER,
    );
  }

  get securityAlertResponseFailedBanner(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER,
    );
  }
}

export default new ConfirmationView();
