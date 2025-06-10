import { ConfirmationTopSheetSelectorsIDs } from '../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../utils/Matchers';

class ConfirmationView {
  get securityAlertBanner(): Promise<Detox.IndexableNativeElement | Detox.NativeElement | Detox.IndexableSystemElement> {
    return Matchers.getElementByID(ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_BANNER);
  }

  get securityAlertResponseFailedBanner(): Promise<Detox.IndexableNativeElement | Detox.NativeElement | Detox.IndexableSystemElement> {
    return Matchers.getElementByID(ConfirmationTopSheetSelectorsIDs.SECURITY_ALERT_RESPONSE_FAILED_BANNER);
  }
}

export default new ConfirmationView(); 