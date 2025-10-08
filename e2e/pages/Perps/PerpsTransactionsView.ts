import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { PerpsTransactionSelectorsIDs } from '../../selectors/Perps/Perps.selectors';

class PerpsTransactionsView {
  // Tabs use visible text from i18n via PerpsTransactionsView
  get tradesTab(): DetoxElement {
    return Matchers.getElementByText(/Trades/i);
  }

  get ordersTab(): DetoxElement {
    return Matchers.getElementByText(/Orders/i);
  }

  get fundingTab(): DetoxElement {
    return Matchers.getElementByText(/Funding/i);
  }

  get anyTransactionItem(): DetoxElement {
    return Matchers.getElementByID(
      PerpsTransactionSelectorsIDs.TRANSACTION_ITEM,
    );
  }

  async openTrades(): Promise<void> {
    await Gestures.waitAndTap(this.tradesTab, {
      elemDescription: 'Open Trades tab',
    });
    await Assertions.expectElementToBeVisible(this.tradesTab, {
      description: 'Trades tab visible',
    });
  }

  async openOrders(): Promise<void> {
    await Gestures.waitAndTap(this.ordersTab, {
      elemDescription: 'Open Orders tab',
    });
    await Assertions.expectElementToBeVisible(this.ordersTab, {
      description: 'Orders tab visible',
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  async openFunding(): Promise<void> {
    await Gestures.waitAndTap(this.fundingTab, {
      elemDescription: 'Open Funding tab',
    });
    await Assertions.expectElementToBeVisible(this.fundingTab, {
      description: 'Funding tab visible',
    });
  }

  async expectTextsInList(itemsText: string[]): Promise<void> {
    for (let i = 0; i < itemsText.length; i++) {
      const transactionItem = await Matchers.getElementByID(
        PerpsTransactionSelectorsIDs.TRANSACTION_ITEM,
        i,
      );
      const attributes = await (
        transactionItem as Detox.IndexableNativeElement
      ).getAttributes();
      let label = '';
      if (
        'elements' in attributes &&
        Array.isArray((attributes as { elements?: unknown }).elements)
      ) {
        const elems = (
          attributes as { elements: { label?: string; text?: string }[] }
        ).elements;
        label = (elems[i]?.label ?? elems[i]?.text ?? '') as string;
      } else {
        label = ((attributes as { label?: string; text?: string }).label ??
          (attributes as { label?: string; text?: string }).text ??
          '') as string;
      }
      console.log(
        `${PerpsTransactionSelectorsIDs.TRANSACTION_ITEM} ${i} label -> "${label}"`,
      );
      console.log(`App Activity Item ${i} label -> "${itemsText[i]}"`);

      // Normalize whitespace differences across platforms (e.g., trailing spaces on Android)
      const expected = label.trim();
      // Fallback to string comparison if regex is not supported by detox matcher type
      await Assertions.checkIfTextMatches(expected, itemsText[i]);
    }
  }
}
export default new PerpsTransactionsView();
