import { ConfirmationPageSectionsSelectorIDs } from '../../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../../utils/Matchers';

class PageSections {
  get AccountNetworkSection() {
    return Matchers.getElementByID(
      ConfirmationPageSectionsSelectorIDs.ACCOUNT_NETWORK_SECTION,
    );
  }

  get OriginInfoSection() {
    return Matchers.getElementByID(
      ConfirmationPageSectionsSelectorIDs.ORIGIN_INFO_SECTION,
    );
  }

  get MessageSection() {
    return Matchers.getElementByID(
      ConfirmationPageSectionsSelectorIDs.MESSAGE_SECTION,
    );
  }
}

export default new PageSections();
