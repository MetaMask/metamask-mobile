import { Assertions, Gestures, Matchers } from '../../framework';

const SwapTrendingTokensSelectorIDs = {
  SECTION: 'bridge-trending-tokens-section',
  PRICE_FILTER: 'bridge-trending-price-filter',
  NETWORK_FILTER: 'bridge-trending-network-filter',
  TIME_FILTER: 'bridge-trending-time-filter',
  PRICE_BOTTOM_SHEET: 'trending-token-price-change-bottom-sheet',
  NETWORK_BOTTOM_SHEET: 'trending-token-network-bottom-sheet',
  TIME_BOTTOM_SHEET: 'trending-token-time-bottom-sheet',
  INNER_LIST: 'trending-tokens-list',
  CLOSE_BUTTON: 'close-button',
  TIME_SELECT_6H: 'time-select-6h',
  BRIDGE_VIEW_SCROLL: 'bridge-view-scroll',
} as const;

class SwapTrendingTokensView {
  private el(id: string): DetoxElement {
    return Matchers.getElementByID(id);
  }

  async expectSectionVisible(timeout = 10000): Promise<void> {
    await Assertions.expectElementToBeVisible(
      this.el(SwapTrendingTokensSelectorIDs.SECTION),
      {
        timeout,
        description: 'Trending section should be visible',
      },
    );
  }

  async expectSectionNotVisible(timeout = 10000): Promise<void> {
    await Assertions.expectElementToNotBeVisible(
      this.el(SwapTrendingTokensSelectorIDs.SECTION),
      {
        timeout,
        description: 'Trending section should not be visible',
      },
    );
  }

  async expectNoInnerList(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(
      this.el(SwapTrendingTokensSelectorIDs.INNER_LIST),
      {
        description:
          'Bridge trending should not render an inner list scroll container',
      },
    );
  }

  async expectPriceBottomSheetVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(
      this.el(SwapTrendingTokensSelectorIDs.PRICE_BOTTOM_SHEET),
      {
        description: 'Price sort bottom sheet should be visible',
      },
    );
  }

  async expectTimeBottomSheetVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(
      this.el(SwapTrendingTokensSelectorIDs.TIME_BOTTOM_SHEET),
      {
        description: 'Time bottom sheet should be visible',
      },
    );
  }

  async expectNetworkBottomSheetVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(
      this.el(SwapTrendingTokensSelectorIDs.NETWORK_BOTTOM_SHEET),
      {
        description: 'Network bottom sheet should be visible',
      },
    );
  }

  tokenRow(assetId: string): DetoxElement {
    return Matchers.getElementByID(`trending-token-row-item-${assetId}`);
  }

  async scrollToFilters(): Promise<void> {
    await Gestures.scrollToElement(
      this.el(SwapTrendingTokensSelectorIDs.PRICE_FILTER),
      Matchers.getIdentifier(SwapTrendingTokensSelectorIDs.BRIDGE_VIEW_SCROLL),
      {
        direction: 'down',
        scrollAmount: 250,
        elemDescription: 'Scroll bridge view to trending filters',
      },
    );
  }

  async openPriceFilter(): Promise<void> {
    await Gestures.waitAndTap(
      this.el(SwapTrendingTokensSelectorIDs.PRICE_FILTER),
      {
        elemDescription: 'Tap trending price filter',
      },
    );
  }

  async openTimeFilter(): Promise<void> {
    await Gestures.waitAndTap(
      this.el(SwapTrendingTokensSelectorIDs.TIME_FILTER),
      {
        elemDescription: 'Tap trending time filter',
      },
    );
  }

  async openNetworkFilter(): Promise<void> {
    await Gestures.waitAndTap(
      this.el(SwapTrendingTokensSelectorIDs.NETWORK_FILTER),
      {
        elemDescription: 'Tap trending network filter',
      },
    );
  }

  async closeBottomSheet(): Promise<void> {
    await Gestures.waitAndTap(
      this.el(SwapTrendingTokensSelectorIDs.CLOSE_BUTTON),
      {
        elemDescription: 'Close trending bottom sheet',
      },
    );
  }

  async selectTimeSixHours(): Promise<void> {
    await Gestures.waitAndTap(
      this.el(SwapTrendingTokensSelectorIDs.TIME_SELECT_6H),
      {
        elemDescription: 'Select 6h time filter',
      },
    );
  }

  async selectNetworkByName(networkName: string): Promise<void> {
    await Gestures.waitAndTap(Matchers.getElementByText(networkName), {
      elemDescription: `Select trending network ${networkName}`,
    });
  }

  async tapTokenRow(assetId: string): Promise<void> {
    await Gestures.waitAndTap(this.tokenRow(assetId), {
      elemDescription: `Tap trending token row ${assetId}`,
    });
  }

  async expectTokenRowVisible(assetId: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.tokenRow(assetId), {
      timeout: 10000,
      description: `Trending token row ${assetId} should be visible`,
    });
  }

  async expectTokenRowNotVisible(assetId: string): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.tokenRow(assetId), {
      timeout: 10000,
      description: `Trending token row ${assetId} should not be visible`,
    });
  }
}

export default new SwapTrendingTokensView();
