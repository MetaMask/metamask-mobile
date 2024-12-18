import {
  TransactionDetailsModalSelectorsText,
  TransactionDetailsModalSelectorsIDs,
} from '../../selectors/Transactions/TransactionDetailsModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { CommonSelectorsIDs } from '../../selectors/Common.selectors';

class TransactionDetailsModal {
  get title() {
    return Matchers.getElementByID(TransactionDetailsModalSelectorsIDs.TITLE);
  }

  get closeIcon() {
    return Matchers.getElementByID(
      TransactionDetailsModalSelectorsIDs.CLOSE_ICON,
    );
  }

  get statusConfirmed() {
    return Matchers.getElementIDWithAncestor(
      CommonSelectorsIDs.STATUS_CONFIRMED,
      TransactionDetailsModalSelectorsIDs.BODY,
    );
  }

  generateExpectedTitle(sourceToken, destinationToken) {
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

export default new TransactionDetailsModal();
