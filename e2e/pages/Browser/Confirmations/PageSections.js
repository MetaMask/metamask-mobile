import { ConfirmationPageSectionsSelectorIDs } from '../../../selectors/Confirmation/ConfirmationView.selectors';
import Gestures from '../../../utils/Gestures';
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

  get SiweSigningAccountInfoSection() {
    return Matchers.getElementByID(
      ConfirmationPageSectionsSelectorIDs.SIWE_SIGNING_ACCOUNT_INFO_SECTION,
    );
  }

  get MessageSection() {
    return Matchers.getElementByID(
      ConfirmationPageSectionsSelectorIDs.MESSAGE_SECTION,
    );
  }

  get ScrollButton() {
    return Matchers.getElementByID(
      ConfirmationPageSectionsSelectorIDs.SCROLL_BUTTON,
    );
  }

  async tapScrollButton() {
    await Gestures.waitAndTap(this.ScrollButton);
  }
}

export default new PageSections();
