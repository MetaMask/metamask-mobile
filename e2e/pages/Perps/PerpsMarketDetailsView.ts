import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketHeaderSelectorsIDs,
  PerpsCandlestickChartSelectorsIDs,
} from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

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
  get scrollView() {
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

  async scrollToBottom() {
    await Gestures.swipe(this.scrollView as unknown as DetoxElement, 'up', {
      speed: 'fast',
      percentage: 0.7,
      elemDescription: 'Perps market details scroll down',
    });
  }
}

export default new PerpsMarketDetailsView();
