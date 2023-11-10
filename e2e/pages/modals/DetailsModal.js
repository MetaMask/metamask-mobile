import TestHelpers from '../../helpers';
import { DetailsModalSelectorsIDs } from '../../selectors/Modals/DetailsModal.selectors';

export default class DetailsModal {
  static async isTitleVisible(title) {
    await TestHelpers.checkIfHasText(DetailsModalSelectorsIDs.TITLE, title);
  }

  static async isStatusCorrect(status) {
    await TestHelpers.checkIfHasText(
      DetailsModalSelectorsIDs.TRANSACTION_STATUS,
      status,
    );
  }

  static async tapOnCloseIcon() {
    try {
      await TestHelpers.waitAndTap(DetailsModalSelectorsIDs.CLOSE_ICON);
      await TestHelpers.delay(1000);
    } catch {
      //
    }
  }
}
