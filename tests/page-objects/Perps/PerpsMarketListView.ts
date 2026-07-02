import {
  PerpsHomeViewSelectorsIDs,
  PerpsMarketListViewSelectorsIDs,
  PerpsMarketRowItemSelectorsIDs,
  PerpsTokenSelectorSelectorsIDs,
  PerpsWatchlistSelectorsIDs,
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
import Utilities from '../../framework/Utilities';
import PerpsMarketDetailsView from './PerpsMarketDetailsView';

export type PerpsOrderSide = 'long' | 'short';

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
  get headerBackButton(): EncapsulatedElementType {
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

  get homeSearchToggle() {
    return Matchers.getElementByID(PerpsHomeViewSelectorsIDs.SEARCH_TOGGLE);
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
        Matchers.getElementByID(PerpsMarketListViewSelectorsIDs.MARKET_LIST),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            PerpsMarketListViewSelectorsIDs.MARKET_LIST,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            PerpsMarketListViewSelectorsIDs.MARKET_LIST,
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

  get marketListScrollableContainer(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(PerpsMarketListViewSelectorsIDs.MARKET_LIST);
  }

  get closeTokenSelector() {
    return Matchers.getElementByID(PerpsTokenSelectorSelectorsIDs.CLOSE_BUTTON);
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

  async openMarketListFromHomeSearch(): Promise<void> {
    await Gestures.waitAndTap(this.homeSearchToggle, {
      elemDescription: 'Perps home search button',
      timeout: 15000,
    });
    await Utilities.isElementVisible(this.searchBar, 15000);
  }

  async tapCloseTokenSelector() {
    await Gestures.waitAndTap(this.closeTokenSelector);
  }

  async waitForMarketListToLoad() {
    await Gestures.waitAndTap(this.container);
  }

  private getMarketRowElement(marketName: string) {
    return Matchers.getElementByID(
      `${PerpsMarketRowItemSelectorsIDs.ROW_ITEM}-${marketName}`,
    );
  }

  private get perpsHomeScrollView(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(PerpsHomeViewSelectorsIDs.SCROLL_CONTENT);
  }

  /**
   * Scrolls the Perps home feed (or full market list) until the market row is visible.
   * Avoids tapping Explore crypto, which is flaky when clipped on CI.
   */
  async scrollToMarketRow(marketName: string): Promise<void> {
    const marketElement = this.getMarketRowElement(marketName);

    if (await Utilities.isElementVisible(marketElement, 1500)) {
      return;
    }

    const watchlistSection = Matchers.getElementByID(
      PerpsWatchlistSelectorsIDs.SECTION,
    );
    const perpsHomeScrollVisible = await Utilities.isElementVisible(
      Matchers.getElementByID(PerpsHomeViewSelectorsIDs.SCROLL_CONTENT),
      1000,
    );

    if (perpsHomeScrollVisible) {
      if (await Utilities.isElementVisible(watchlistSection, 1000)) {
        await Gestures.scrollToElement(
          watchlistSection,
          this.perpsHomeScrollView,
          {
            direction: 'down',
            scrollAmount: 200,
            timeout: 10000,
            elemDescription: 'Perps home watchlist section',
          },
        );
      }

      if (await Utilities.isElementVisible(marketElement, 1000)) {
        return;
      }

      await Gestures.scrollToElement(marketElement, this.perpsHomeScrollView, {
        direction: 'down',
        scrollAmount: 200,
        timeout: 10000,
        elemDescription: `${marketName} market row on Perps home`,
      });

      if (await Utilities.isElementVisible(marketElement, 1000)) {
        return;
      }

      await Gestures.scrollToElement(marketElement, this.perpsHomeScrollView, {
        direction: 'up',
        scrollAmount: 200,
        timeout: 10000,
        elemDescription: `${marketName} market row on Perps home (scroll up)`,
      });

      return;
    }

    const marketListVisible = await Utilities.isElementVisible(
      Matchers.getElementByID(PerpsMarketListViewSelectorsIDs.MARKET_LIST),
      1000,
    );
    if (marketListVisible) {
      await Gestures.scrollToElement(
        marketElement,
        this.marketListScrollableContainer,
        {
          direction: 'down',
          scrollAmount: 200,
          timeout: 10000,
          elemDescription: `${marketName} market row in market list`,
        },
      );
    }
  }

  async selectMarket(marketName: string) {
    await encapsulatedAction({
      detox: async () => {
        const marketElement = this.getMarketRowElement(marketName);
        try {
          await this.scrollToMarketRow(marketName);
        } catch {
          await this.openMarketListFromHomeSearch();
          await Gestures.typeText(this.searchBar, marketName, {
            elemDescription: 'Perps market search input',
            hideKeyboard: true,
          });
          await Gestures.scrollToElement(
            marketElement,
            this.marketListScrollableContainer,
            {
              direction: 'down',
              scrollAmount: 200,
              timeout: 10000,
              elemDescription: `${marketName} market row in searched market list`,
            },
          );
        }
        await Gestures.waitAndTap(marketElement, {
          elemDescription: `${marketName} market row`,
        });
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

  /**
   * Selects a market from the Perps home watchlist and taps Long or Short on
   * market details. Scrolls the home feed when needed; retries until both steps succeed.
   */
  async selectMarketAndTapOrderSide(
    marketName: string,
    side: PerpsOrderSide,
    options: { interval?: number; timeout?: number } = {},
  ): Promise<void> {
    const { interval = 1000, timeout = 30000 } = options;
    await Utilities.executeWithRetry(
      async () => {
        await this.selectMarket(marketName);
        if (side === 'long') {
          await PerpsMarketDetailsView.tapLongButton();
        } else {
          await PerpsMarketDetailsView.tapShortButton();
        }
      },
      { interval, timeout },
    );
  }
}

export default new PerpsMarketListView();
