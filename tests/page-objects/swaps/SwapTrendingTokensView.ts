import { Assertions, Gestures, Matchers } from '../../framework';
import { BridgeViewSelectorsIDs } from '../../../app/components/UI/Bridge/Views/BridgeView/BridgeView.testIds';
import { BridgeTrendingTokensSectionTestIds } from '../../../app/components/UI/Bridge/components/BridgeTrendingTokensSection/BridgeTrendingTokensSection.testIds';

const SwapTrendingTokensViewTestIds = {
  PRICE_BOTTOM_SHEET: 'trending-token-price-change-bottom-sheet',
  NETWORK_BOTTOM_SHEET: 'trending-token-network-bottom-sheet',
  TIME_BOTTOM_SHEET: 'trending-token-time-bottom-sheet',
  INNER_LIST: 'trending-tokens-list',
  CLOSE_BUTTON: 'close-button',
  TIME_SELECT_6H: 'time-select-6h',
  TOKEN_ROW_PREFIX: 'trending-token-row-item-',
} as const;

class SwapTrendingTokensView {
  public get section(): DetoxElement {
    return Matchers.getElementByID(BridgeTrendingTokensSectionTestIds.SECTION);
  }

  public get priceFilter(): DetoxElement {
    return Matchers.getElementByID(
      BridgeTrendingTokensSectionTestIds.PRICE_FILTER,
    );
  }

  public get networkFilter(): DetoxElement {
    return Matchers.getElementByID(
      BridgeTrendingTokensSectionTestIds.NETWORK_FILTER,
    );
  }

  public get timeFilter(): DetoxElement {
    return Matchers.getElementByID(
      BridgeTrendingTokensSectionTestIds.TIME_FILTER,
    );
  }

  public get priceBottomSheet(): DetoxElement {
    return Matchers.getElementByID(
      SwapTrendingTokensViewTestIds.PRICE_BOTTOM_SHEET,
    );
  }

  public get networkBottomSheet(): DetoxElement {
    return Matchers.getElementByID(
      SwapTrendingTokensViewTestIds.NETWORK_BOTTOM_SHEET,
    );
  }

  public get timeBottomSheet(): DetoxElement {
    return Matchers.getElementByID(
      SwapTrendingTokensViewTestIds.TIME_BOTTOM_SHEET,
    );
  }

  public get innerList(): DetoxElement {
    return Matchers.getElementByID(SwapTrendingTokensViewTestIds.INNER_LIST);
  }

  public get closeButton(): DetoxElement {
    return Matchers.getElementByID(SwapTrendingTokensViewTestIds.CLOSE_BUTTON);
  }

  public get timeSelectSixHours(): DetoxElement {
    return Matchers.getElementByID(
      SwapTrendingTokensViewTestIds.TIME_SELECT_6H,
    );
  }

  async expectSectionVisible(timeout = 10000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.section, {
      timeout,
      description: 'Trending section should be visible',
    });
  }

  async expectSectionNotVisible(timeout = 10000): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.section, {
      timeout,
      description: 'Trending section should not be visible',
    });
  }

  async expectNoInnerList(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.innerList, {
      description:
        'Bridge trending should not render an inner list scroll container',
    });
  }

  async expectPriceBottomSheetVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.priceBottomSheet, {
      description: 'Price sort bottom sheet should be visible',
    });
  }

  async expectTimeBottomSheetVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.timeBottomSheet, {
      description: 'Time bottom sheet should be visible',
    });
  }

  async expectNetworkBottomSheetVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.networkBottomSheet, {
      description: 'Network bottom sheet should be visible',
    });
  }

  tokenRow(assetId: string): DetoxElement {
    return Matchers.getElementByID(
      `${SwapTrendingTokensViewTestIds.TOKEN_ROW_PREFIX}${assetId}`,
    );
  }

  async scrollToFilters(): Promise<void> {
    await Gestures.scrollToElement(
      this.priceFilter,
      Matchers.getIdentifier(BridgeViewSelectorsIDs.BRIDGE_VIEW_SCROLL),
      {
        direction: 'down',
        scrollAmount: 250,
        elemDescription: 'Scroll bridge view to trending filters',
      },
    );
  }

  async openPriceFilter(): Promise<void> {
    await Gestures.waitAndTap(this.priceFilter, {
      elemDescription: 'Tap trending price filter',
    });
  }

  async openTimeFilter(): Promise<void> {
    await Gestures.waitAndTap(this.timeFilter, {
      elemDescription: 'Tap trending time filter',
    });
  }

  async openNetworkFilter(): Promise<void> {
    await Gestures.waitAndTap(this.networkFilter, {
      elemDescription: 'Tap trending network filter',
    });
  }

  async closeBottomSheet(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Close trending bottom sheet',
    });
  }

  async selectTimeSixHours(): Promise<void> {
    await Gestures.waitAndTap(this.timeSelectSixHours, {
      elemDescription: 'Select 6h time filter',
    });
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
