import {
  PerpsMarketListViewSelectorsIDs,
  PerpsTokenSelectorSelectorsIDs,
  getPerpsMarketRowItemSelector,
} from '../../../app/components/UI/Perps/Perps.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class PerpsMarketListView {
  // Main container
  get container() {
    return Matchers.getElementByID(PerpsTokenSelectorSelectorsIDs.MODAL);
  }

  get title() {
    return Matchers.getElementByID(PerpsTokenSelectorSelectorsIDs.TITLE);
  }

  get closeButton() {
    return Matchers.getElementByID(
      PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON,
    );
  }

  // Search functionality
  get searchToggleButton() {
    return Matchers.getElementByID(
      PerpsMarketListViewSelectorsIDs.SEARCH_TOGGLE_BUTTON,
    );
  }

  get searchClearButton() {
    return Matchers.getElementByID(
      PerpsMarketListViewSelectorsIDs.SEARCH_CLEAR_BUTTON,
    );
  }

  get listHeader() {
    return Matchers.getElementByID(PerpsMarketListViewSelectorsIDs.LIST_HEADER);
  }

  get marketRowItemBTC() {
    return Matchers.getElementByID(
      getPerpsMarketRowItemSelector.rowItem('BTC'),
    );
  }

  // Generic selector for first market row item (regardless of coin)
  get firstMarketRowItem() {
    // Match any element with testID that starts with 'perps-market-row-item-' and get the first one
    return Matchers.getElementByID(/^perps-market-row-item-.*/, 0);
  }

  get tokenSelectorContainer() {
    return Matchers.getElementByID(PerpsTokenSelectorSelectorsIDs.CONTAINER);
  }

  get tokenSelectorModal() {
    return Matchers.getElementByID(PerpsTokenSelectorSelectorsIDs.MODAL);
  }

  get scrollableContainer(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(PerpsTokenSelectorSelectorsIDs.MODAL);
  }

  get closeTokenSelector() {
    return Matchers.getElementByID(PerpsTokenSelectorSelectorsIDs.CLOSE_BUTTON);
  }

  // Actions
  async tapMarketRowItemBTC() {
    await Gestures.scrollToElement(
      this.marketRowItemBTC,
      this.scrollableContainer,
      {
        direction: 'down',
        scrollAmount: 200,
        elemDescription: 'Perps Market Row BTC',
      },
    );
    await Gestures.waitAndTap(this.marketRowItemBTC, {
      elemDescription: 'Perps Market Row BTC',
      checkStability: true,
    });
  }

  async tapFirstMarketRowItem() {
    await Gestures.scrollToElement(
      this.firstMarketRowItem,
      this.scrollableContainer,
      {
        direction: 'down',
        scrollAmount: 200,
        elemDescription: 'Perps First Market Row',
      },
    );
    await Gestures.waitAndTap(this.firstMarketRowItem, {
      elemDescription: 'Perps First Market Row',
      checkStability: true,
    });
  }

  async tapSearchToggleButton() {
    await Gestures.waitAndTap(this.searchToggleButton);
  }

  async tapSearchClearButton() {
    await Gestures.waitAndTap(this.searchClearButton);
  }

  async tapCloseTokenSelector() {
    await Gestures.waitAndTap(this.closeTokenSelector);
  }

  async waitForMarketListToLoad() {
    await Gestures.waitAndTap(this.container);
  }

  // Helper method to select a specific market by text
  async selectMarket(marketName: string) {
    const marketElement = Matchers.getElementByText(marketName);
    await Gestures.waitAndTap(marketElement);
  }
}

export default new PerpsMarketListView();
