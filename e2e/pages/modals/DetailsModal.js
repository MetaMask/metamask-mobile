import TestHelpers from '../../helpers';
import {
  DETAILS_MODAL_TITLE,
  DETAILS_MODAL_STATUS_CONFIRMED,
  DETAILS_MODAL_CLOSE_ICON,
} from '../../../wdio/screen-objects/testIDs/Components/DetailsModal.js';
import { TransactionDetailsModalSelectorsText } from '../../selectors/Modals/TransactionDetailsModal.selectors';

export default class DetailsModal {
  static async isTitleVisible(sourceToken, destinationToken) {
    let title = TransactionDetailsModalSelectorsText.TITLE;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    await TestHelpers.checkIfElementHasString(DETAILS_MODAL_TITLE, title);
  }

  static async isStatusCorrect(status) {
    await TestHelpers.checkIfElementHasString(
      DETAILS_MODAL_STATUS_CONFIRMED,
      status,
    );
  }

  static async tapOnCloseIcon() {
    try {
      await TestHelpers.waitAndTap(DETAILS_MODAL_CLOSE_ICON);
      await TestHelpers.delay(1000);
    } catch {
      //
    }
  }
}
