import {
  TransactionDetailsModalSelectorsText,
  TransactionDetailsModalSelectorsIDs,
} from '../../selectors/Transactions/TransactionDetailsModal.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { logger } from '../../framework';

class TransactionDetailsModal {
  get title(): DetoxElement {
    return Matchers.getElementByID(TransactionDetailsModalSelectorsIDs.TITLE);
  }

  get closeIcon(): DetoxElement {
    return Matchers.getElementByID(
      TransactionDetailsModalSelectorsIDs.CLOSE_ICON,
    );
  }

  generateExpectedTitle(sourceToken: string, destinationToken: string): string {
    let title = TransactionDetailsModalSelectorsText.TITLE;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
  }

  async tapOnCloseIcon(): Promise<void> {
    try {
      await Gestures.waitAndTap(this.closeIcon);
    } catch {
      // Handle error
      logger.warn(
        'TransactionDetailsModal: tapOnCloseIcon - failed, skipping tap.',
      );
    }
  }
}

export default new TransactionDetailsModal();
