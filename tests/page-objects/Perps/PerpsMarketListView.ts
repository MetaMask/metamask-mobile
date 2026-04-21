import {
  PerpsMarketListViewSelectorsIDs,
  PerpsMarketRowItemSelectorsIDs,
  PerpsTokenSelectorSelectorsIDs,
  getPerpsMarketRowItemSelector,
} from '../../../app/components/UI/Perps/Perps.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import {
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { encapsulatedAction, PlaywrightGestures } from '../../framework';

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

  /**
   * HeaderCompactStandard back on explore market list (see PerpsMarketListView.tsx).
   * Navigates from the market list back to Perps portfolio home.
   */
  get headerBackButton(): DetoxElement {
    return Matchers.getElementByID(
      `${PerpsMarketListViewSelectorsIDs.CLOSE_BUTTON}-back-button`,
    );
  }

  async tapHeaderBackToPortfolioHome(): Promise<void> {
    await Gestures.waitAndTap(this.headerBackButton, {
      elemDescription: 'Market list header back (to Perps portfolio home)',
      timeout: 15000,
    });
  }

  get searchBar() {
    return Matchers.getElementByID(PerpsMarketListViewSelectorsIDs.SEARCH_BAR);
  }

  get searchClearButton() {
    return Matchers.getElementByID(
      PerpsMarketListViewSelectorsIDs.SEARCH_CLEAR_BUTTON,
    );
  }

  /** List header - wdio PerpsMarketListView uses 'perps-home' for isHeaderVisible */
  get listHeader(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsMarketListViewSelectorsIDs.LIST_HEADER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsMarketListViewSelectorsIDs.LIST_HEADER,
          { exact: true },
        ),
    });
  }

  get header(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsMarketListViewSelectorsIDs.CONTAINER),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            PerpsMarketListViewSelectorsIDs.CONTAINER,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            PerpsMarketListViewSelectorsIDs.CONTAINER,
          ),
      },
    });
  }

  get marketRowItemBTC(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(getPerpsMarketRowItemSelector.rowItem('BTC')),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            getPerpsMarketRowItemSelector.rowItem('BTC'),
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            getPerpsMarketRowItemSelector.rowItem('BTC'),
          ),
      },
    });
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

  get BTCMarketRowItem() {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(getPerpsMarketRowItemSelector.rowItem('BTC')),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            getPerpsMarketRowItemSelector.rowItem('BTC'),
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            getPerpsMarketRowItemSelector.rowItem('BTC'),
          ),
      },
    });
  }

  // Actions
  async tapMarketRowItemBTC() {
    await encapsulatedAction({
      appium: async () => {
        const marketElement = await asPlaywrightElement(this.marketRowItemBTC);
        await PlaywrightGestures.scrollIntoView(marketElement);
        await PlaywrightGestures.waitAndTap(marketElement);
      },
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

  async tapSearchClearButton() {
    await Gestures.waitAndTap(this.searchClearButton);
  }

  async tapCloseTokenSelector() {
    await Gestures.waitAndTap(this.closeTokenSelector);
  }

  async waitForMarketListToLoad() {
    await Gestures.waitAndTap(this.container);
  }

  async selectMarket(marketName: string) {
    await encapsulatedAction({
      detox: async () => {
        const marketElement = Matchers.getElementByText(marketName);
        await Gestures.waitAndTap(marketElement);
      },
      appium: async () => {
        const marketSelector = `${PerpsMarketRowItemSelectorsIDs.ROW_ITEM}-${marketName}`;
        const marketElement = await PlaywrightMatchers.getElementById(
          marketSelector,
          { exact: true },
        );
        await PlaywrightGestures.scrollIntoView(marketElement);
        await PlaywrightGestures.waitAndTap(marketElement);
      },
    });
  }
}

export default new PerpsMarketListView();
