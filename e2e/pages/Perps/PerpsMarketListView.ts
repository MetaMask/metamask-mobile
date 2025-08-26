import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import {
  PerpsMarketListViewSelectorsIDs,
  getPerpsMarketRowItemSelector,
} from '../../selectors/Perps/Perps.selectors';

class PerpsMarketListView {
  get container(): DetoxElement {
    // Use a stable element on the markets screen: the search button
    return Matchers.getElementByID(
      PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
    );
  }

  async expectLoaded(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Perps Market List should be visible',
    });
  }

  get tutorialButton(): DetoxElement {
    return Matchers.getElementByID(
      PerpsMarketListViewSelectorsIDs.TUTORIAL_BUTTON,
    );
  }

  async tapTutorialButton(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.tutorialButton, {
      description: 'Perps tutorial button should be visible',
    });
    await device.disableSynchronization();
    try {
      await Gestures.waitAndTap(this.tutorialButton, {
        elemDescription: 'Tap Perps tutorial header button',
      });
    } finally {
      await device.enableSynchronization();
    }
  }

  async tapFirstMarketRowByKnownSymbols(): Promise<void> {
    const symbolsToTry = ['BTC', 'ETH', 'SOL', 'ARB'];
    for (const sym of symbolsToTry) {
      try {
        await this.tapMarketRowBySymbol(sym);
        return;
      } catch {
        // continue to next symbol
      }
    }
    throw new Error('Could not find any known market symbol to tap');
  }

  async waitForAnyKnownMarket(timeoutMs = 20000, pollMs = 1000): Promise<void> {
    const start = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await this.tapFirstMarketRowByKnownSymbols();
        return;
      } catch (err) {
        if (Date.now() - start > timeoutMs) {
          // Add a helpful log line before throwing
          // eslint-disable-next-line no-console
          console.log('Timed out waiting for any known market symbol');
          throw err;
        }
        await new Promise((r) => setTimeout(r, pollMs));
      }
    }
  }

  async tapMarketRowBySymbol(symbol: string): Promise<void> {
    const id = getPerpsMarketRowItemSelector.rowItem(symbol);
    const el = Matchers.getElementByID(id);
    // Ensure visibility: scroll the FlashList if necessary
    try {
      await Assertions.expectElementToBeVisible(el, {
        description: `Expect ${id} visible before tap`,
      });
    } catch {
      await Gestures.scrollToElement(
        el,
        Promise.resolve(by.id(PerpsMarketListViewSelectorsIDs.LIST)),
        {
          elemDescription: `Scroll to ${id}`,
          direction: 'down',
          scrollAmount: 350,
          delay: 200,
        },
      );
    }
    await Gestures.waitAndTap(el, {
      elemDescription: `Tap perps market row ${symbol}`,
    });
  }
}

export default new PerpsMarketListView();
