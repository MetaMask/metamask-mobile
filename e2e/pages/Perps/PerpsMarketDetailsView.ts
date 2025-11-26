import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketHeaderSelectorsIDs,
  PerpsCandlestickChartSelectorsIDs,
  PerpsMarketTabsSelectorsIDs,
  PerpsOpenOrderCardSelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import Assertions from '../../framework/Assertions';

class PerpsMarketDetailsView {
  // Container elements
  get container() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.CONTAINER,
    );
  }

  get loadingState() {
    return Matchers.getElementByID(PerpsMarketDetailsViewSelectorsIDs.LOADING);
  }

  get errorState() {
    return Matchers.getElementByID(PerpsMarketDetailsViewSelectorsIDs.ERROR);
  }

  // Header elements
  get header() {
    return Matchers.getElementByID(PerpsMarketDetailsViewSelectorsIDs.HEADER);
  }

  get backButton() {
    return Matchers.getElementByID(PerpsMarketHeaderSelectorsIDs.BACK_BUTTON);
  }

  get assetIcon() {
    return Matchers.getElementByID(PerpsMarketHeaderSelectorsIDs.ASSET_ICON);
  }

  get assetName() {
    return Matchers.getElementByID(PerpsMarketHeaderSelectorsIDs.ASSET_NAME);
  }

  get price() {
    return Matchers.getElementByID(PerpsMarketHeaderSelectorsIDs.PRICE);
  }

  get priceChange() {
    return Matchers.getElementByID(PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE);
  }

  get moreButton() {
    return Matchers.getElementByID(PerpsMarketHeaderSelectorsIDs.MORE_BUTTON);
  }

  // Statistics elements
  get statisticsHigh24h() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.STATISTICS_HIGH_24H,
    );
  }

  get statisticsLow24h() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.STATISTICS_LOW_24H,
    );
  }

  get statisticsVolume24h() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.STATISTICS_VOLUME_24H,
    );
  }

  get statisticsOpenInterest() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.STATISTICS_OPEN_INTEREST,
    );
  }

  get statisticsFundingRate() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_RATE,
    );
  }

  get statisticsFundingCountdown() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_COUNTDOWN,
    );
  }

  // Chart elements
  get candlestickChart() {
    return Matchers.getElementByID(PerpsCandlestickChartSelectorsIDs.CONTAINER);
  }

  get chartCandles() {
    return Matchers.getElementByID(PerpsCandlestickChartSelectorsIDs.CANDLES);
  }

  get chartTooltip() {
    return Matchers.getElementByID(PerpsCandlestickChartSelectorsIDs.TOOLTIP);
  }

  get chartLoadingSkeleton() {
    return Matchers.getElementByID(
      PerpsCandlestickChartSelectorsIDs.LOADING_SKELETON,
    );
  }

  // Scroll view
  get scrollView(): DetoxElement {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
    );
  }

  // Trading action buttons
  get longButton() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
    );
  }

  get shortButton() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON,
    );
  }

  // Info icons
  get openInterestInfoIcon() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.OPEN_INTEREST_INFO_ICON,
    );
  }

  get fundingRateInfoIcon() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.FUNDING_RATE_INFO_ICON,
    );
  }

  // Bottom sheet elements
  get candlePeriodBottomSheet() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.CANDLE_PERIOD_BOTTOM_SHEET,
    );
  }

  get bottomSheetTooltip() {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP,
    );
  }

  // Actions
  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }

  async tapLongButton() {
    // Ensure button is enabled before tapping to avoid flaky interactions
    await Utilities.waitForElementToBeEnabled(this.longButton as DetoxElement);
    await Gestures.waitAndTap(this.longButton);
  }

  async tapShortButton() {
    await Gestures.waitAndTap(this.shortButton);
  }

  async tapMoreButton() {
    await Gestures.waitAndTap(this.moreButton);
  }

  async tapOpenInterestInfoIcon() {
    await Gestures.waitAndTap(this.openInterestInfoIcon);
  }

  async tapFundingRateInfoIcon() {
    await Gestures.waitAndTap(this.fundingRateInfoIcon);
  }

  async waitForMarketDetailsToLoad() {
    await Gestures.waitAndTap(this.container);
  }

  async waitForChartToLoad() {
    await Gestures.waitAndTap(this.candlestickChart);
  }

  // Ensures the screen is ready (scroll view exists and UI is stable) before scrolling
  async waitForScreenReady() {
    await Utilities.waitForReadyState(this.scrollView, {
      checkStability: true,
      elemDescription: 'Perps market details scroll view',
    });
  }

  async scrollToBottom() {
    await Gestures.swipe(this.scrollView, 'up', {
      speed: 'fast',
      percentage: 0.7,
      elemDescription: 'Perps market details scroll down',
    });
  }

  // Verify that Orders tab has at least one open order card
  async expectOpenOrderVisible() {
    const ordersTab = Matchers.getElementByID(
      PerpsMarketTabsSelectorsIDs.ORDERS_TAB,
    );
    await Gestures.waitAndTap(ordersTab, {
      elemDescription: 'Open Orders tab',
    });
    const openOrderCard = Matchers.getElementByID(
      PerpsOpenOrderCardSelectorsIDs.CARD,
    ) as DetoxElement;

    // Try a few extra scroll attempts; then assert to avoid masking regressions
    for (let i = 0; i < 3; i++) {
      const visible = await Utilities.isElementVisible(openOrderCard, 2000);
      if (visible) {
        break;
      }
      await Gestures.swipe(this.scrollView, 'up', {
        speed: 'fast',
        percentage: 0.6,
        elemDescription: 'Scroll market details to reveal order card',
      });
    }

    await Assertions.expectElementToBeVisible(openOrderCard, {
      description: 'Open limit order card is visible on Orders tab',
      timeout: 5000,
    });
  }

  async expectNoOpenOrderVisible() {
    const openOrderCard = Matchers.getElementByID(
      PerpsOpenOrderCardSelectorsIDs.CARD,
    ) as DetoxElement;
    await Assertions.expectElementToNotBeVisible(openOrderCard, {
      description: 'Open limit order card is not visible',
    });
  }

  // Ensure Close Position button is visible by performing best-effort scrolls, then assert
  async expectClosePositionButtonVisible() {
    const closeBtn = Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
    ) as DetoxElement;

    for (let i = 0; i < 3; i++) {
      const visible = await Utilities.isElementVisible(closeBtn, 2000);
      if (visible) {
        break;
      }
      await Gestures.swipe(this.scrollView, 'up', {
        speed: 'fast',
        percentage: 0.7,
        elemDescription: 'Scroll to reveal Close position button',
      });
    }

    await Assertions.expectElementToBeVisible(closeBtn, {
      description: 'Close position button visible on market details',
      timeout: 5000,
    });
  }
}

export default new PerpsMarketDetailsView();
