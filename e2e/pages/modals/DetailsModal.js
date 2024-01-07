import {
  TransactionDetailsModalSelectorsText,
  TransactionDetailsModalSelectorsIDs,
} from '../../selectors/Modals/TransactionDetailsModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class DetailsModal {
  get title() {
    return Matchers.getElementByID(TransactionDetailsModalSelectorsIDs.TITLE);
  }

  get statusConfirmed() {
    return Matchers.getElementByID(
      TransactionDetailsModalSelectorsIDs.STATUS_CONFIRMED,
    );
  }

  get closeIcon() {
    return Matchers.getElementByID(
      TransactionDetailsModalSelectorsIDs.CLOSE_ICON,
    );
  }

  async generateExpectedTitle(sourceToken, destinationToken) {
    let title = TransactionDetailsModalSelectorsText.TITLE;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
  }

  async tapOnCloseIcon() {
    try {
      await Gestures.waitAndTap(this.closeIcon);
    } catch {
      //
    }
  }
}

export default new DetailsModal();
