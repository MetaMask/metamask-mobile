import TestHelpers from '../../helpers';
import {
  DETAILS_MODAL_TITLE,
  DETAILS_MODAL_STATUS_CONFIRMED,
  DETAILS_MODAL_CLOSE_ICON,
} from '../../../wdio/screen-objects/testIDs/Components/DetailsModal.js';
import messages from '../../../locales/languages/en.json';

export default class DetailsModal {
  static async isTitleVisible(sourceToken, destinationToken) {
    let title = messages.swaps.transaction_label.swap;
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

  static async tapOnCloseIcon(status) {
    await TestHelpers.waitAndTap(DETAILS_MODAL_CLOSE_ICON);
  }
}
