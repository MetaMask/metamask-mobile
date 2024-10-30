import {
  TransactionDetailsBottomSheetSelectorsText,
  TransactionDetailsBottomSheetSelectorsIDs,
} from '../../selectors/Transactions/TransactionDetailsBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { CommonSelectorsIDs } from '../../selectors/Common.selectors';

class DetailsBottomSheet {
  get title() {
    return Matchers.getElementByID(TransactionDetailsBottomSheetSelectorsIDs.TITLE);
  }

  get closeIcon() {
    return Matchers.getElementByID(
      TransactionDetailsBottomSheetSelectorsIDs.CLOSE_ICON,
    );
  }

  get statusConfirmed() {
    return Matchers.getElementIDWithAncestor(
      CommonSelectorsIDs.STATUS_CONFIRMED,
      TransactionDetailsBottomSheetSelectorsIDs.BODY,
    );
  }

  generateExpectedTitle(sourceToken, destinationToken) {
    let title = TransactionDetailsBottomSheetSelectorsText.TITLE;
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

export default new DetailsBottomSheet();
