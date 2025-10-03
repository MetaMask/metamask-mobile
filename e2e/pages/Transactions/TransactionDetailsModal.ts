import {
  TransactionDetailsModalSelectorsText,
  TransactionDetailsModalSelectorsIDs,
  TransactionDetailsSelectorIDs,
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

  get paidWithSymbol(): DetoxElement {
    return Matchers.getElementByID(
      TransactionDetailsSelectorIDs.PAID_WITH_SYMBOL,
    );
  }

  get networkFee(): DetoxElement {
    return Matchers.getElementByID(TransactionDetailsSelectorIDs.NETWORK_FEE);
  }

  get bridgeFee(): DetoxElement {
    return Matchers.getElementByID(TransactionDetailsSelectorIDs.BRIDGE_FEE);
  }

  get total(): DetoxElement {
    return Matchers.getElementByID(TransactionDetailsSelectorIDs.TOTAL);
  }

  summaryLine(index: number): DetoxElement {
    return Matchers.getElementByID(
      TransactionDetailsSelectorIDs.SUMMARY_LINE,
      index,
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
