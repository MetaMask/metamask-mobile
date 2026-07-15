import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketHeaderSelectorsIDs,
  PerpsCandlestickChartSelectorsIDs,
  PerpsOpenOrderCardSelectorsIDs,
  PerpsClosePositionViewSelectorsIDs,
  PerpsPositionCardSelectorsIDs,
  PerpsCompactOrderRowSelectorsIDs,
} from '../../../app/components/UI/Perps/Perps.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import Assertions from '../../framework/Assertions';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
  asDetoxElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { PlaywrightGestures } from '../../framework';
import { isPositionOpen } from '../../flows/perps.flow';

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

  /** Header - wdio PerpsPositionDetailsView uses 'perps-market-header' for isContainerDisplayed */
  get header(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsMarketDetailsViewSelectorsIDs.HEADER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsMarketDetailsViewSelectorsIDs.HEADER,
          {
            exact: true,
          },
        ),
    });
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
  get scrollView(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
    );
  }

  get closeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
        ) as DetoxElement,
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
          { exact: true },
        ),
    });
  }

  get confirmCloseButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
        ) as DetoxElement,
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsClosePositionViewSelectorsIDs.CLOSE_POSITION_CONFIRM_BUTTON,
          { exact: true },
        ),
    });
  }

  // Trading action buttons — On Android, Reanimated's AnimatedPressable
  // inside ButtonSemantic doesn't propagate testID to resource-id, so Appium
  // targets the plain View wrapper (LONG/SHORT_BUTTON_WRAPPER) instead.
  get longButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
          ),
        ios: () =>
          PlaywrightMatchers.getElementById(
            PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON,
          ),
      },
    });
  }

  get shortButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON,
        ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON,
          ),
        ios: () =>
          PlaywrightMatchers.getElementById(
            PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON,
          ),
      },
    });
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
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.backButton, {
          elemDescription: 'Perps market details back',
        });
      },
      appium: async () => {
        const backEl = await asPlaywrightElement(this.backButton);
        await PlaywrightGestures.waitAndTap(backEl, {
          checkForDisplayed: true,
          timeout: 15_000,
        });
      },
    });
  }

  async tapLongButton() {
    await encapsulatedAction({
      detox: async () => {
        await Utilities.waitForElementToBeEnabled(
          this.longButton as DetoxElement,
        );
        await Gestures.waitAndTap(this.longButton, {
          elemDescription: 'Perps Long button',
        });
      },
      appium: async () => {
        console.log('tapLongButton appium');
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.longButton),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
            checkForStable: true,
          },
        );
      },
    });
  }

  async tapShortButton() {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.shortButton);
      },
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.shortButton),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
            checkForStable: true,
          },
        );
      },
    });
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

  /**
   * Waits for a newly placed limit order to appear on market details (compact orders section).
   * Perps navigates here immediately after Place order while the WebSocket feed catches up.
   */
  async expectCompactOpenOrderVisible(options: {
    direction: 'long' | 'short';
    timeout?: number;
  }): Promise<void> {
    const { direction, timeout = 60000 } = options;
    const orderLabel = `Limit ${direction}`;
    const firstRow = Matchers.getElementByID(
      PerpsCompactOrderRowSelectorsIDs.FIRST_ROW,
    );
    const scrollContainer = Matchers.scrollContainer(
      PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
    );

    await Utilities.executeWithRetry(
      async () => {
        try {
          await Gestures.scrollToElement(
            Matchers.getElementByText(orderLabel),
            scrollContainer,
            {
              direction: 'down',
              scrollAmount: 200,
              timeout: 5000,
              elemDescription: `Scroll to ${orderLabel} on market details`,
            },
          );
        } catch {
          // Order row may not be in the DOM yet.
        }

        try {
          await Assertions.expectElementToBeVisible(firstRow, {
            description: 'Compact open order row on market details',
            timeout: 3000,
          });
          return;
        } catch {
          await Assertions.expectTextDisplayed(orderLabel, {
            description: `${orderLabel} visible on market details`,
            timeout: 3000,
          });
        }
      },
      { interval: 1000, timeout },
    );
  }

  /** Asserts the compact open-order row for this limit direction is gone (e.g. after cancel or fill). */
  async expectCompactOpenOrderNotVisible(options: {
    direction: 'long' | 'short';
    timeout?: number;
  }): Promise<void> {
    const { direction, timeout = 60000 } = options;
    const orderLabel = `Limit ${direction}`;
    const firstRow = Matchers.getElementByID(
      PerpsCompactOrderRowSelectorsIDs.FIRST_ROW,
    );

    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectElementToNotBeVisible(firstRow, {
          description: 'Compact open order row cleared from market details',
          timeout: 3000,
        });
        await Assertions.expectTextNotDisplayed(orderLabel, {
          description: `${orderLabel} cleared from market details`,
          timeout: 3000,
        });
      },
      { interval: 1000, timeout },
    );
  }

  // Verify that Orders tab has at least one open order card
  async expectOpenOrderVisible() {
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
    );

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

  /** When the position is gone (manual close, SL, TP, liquidation), this CTA is removed from market details. */
  async expectClosePositionButtonNotVisible() {
    const closeBtn = Matchers.getElementByID(
      PerpsMarketDetailsViewSelectorsIDs.CLOSE_BUTTON,
    );
    await Assertions.expectElementToNotBeVisible(closeBtn, {
      description:
        'Close position button should not be visible when there is no open position on this market',
      timeout: 5000,
    });
  }

  async tapFirstCompactOrderRow(): Promise<void> {
    const firstOrderRow = Matchers.getElementByID(
      PerpsCompactOrderRowSelectorsIDs.FIRST_ROW,
    );

    await Gestures.scrollToElement(
      firstOrderRow,
      Matchers.scrollContainer(PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW),
      {
        direction: 'down',
        scrollAmount: 250,
        elemDescription: 'Scroll market details to first open order row',
      },
    );

    await Gestures.waitAndTap(firstOrderRow, {
      elemDescription: 'Tap first compact open order row',
      timeout: 15000,
    });
  }

  async tapAutoCloseSection(): Promise<void> {
    const autoCloseSection = Matchers.getElementByID(
      PerpsPositionCardSelectorsIDs.AUTO_CLOSE_TOGGLE,
    );
    const scrollContainer = Matchers.scrollContainer(
      PerpsMarketDetailsViewSelectorsIDs.SCROLL_VIEW,
    );

    await encapsulatedAction({
      detox: async () => {
        await Gestures.scrollToElement(autoCloseSection, scrollContainer, {
          direction: 'down',
          scrollAmount: 250,
          elemDescription: 'Scroll market details to Auto close section',
        });
        await Gestures.waitAndTap(autoCloseSection, {
          elemDescription: 'Tap Auto close section on position card',
          checkStability: true,
        });
      },
      appium: async () => {
        await UnifiedGestures.scrollToElement(
          autoCloseSection,
          scrollContainer,
          {
            direction: 'down',
            description: 'Scroll market details to Auto close section',
          },
        );

        await UnifiedGestures.waitAndTap(autoCloseSection, {
          description: 'Tap Auto close section on position card',
          checkForDisplayed: true,
          checkForEnabled: false,
        });
      },
    });
  }

  async tapOpenOrderCancelButton(): Promise<void> {
    const cancelButton = Matchers.getElementByID(
      PerpsOpenOrderCardSelectorsIDs.CANCEL_BUTTON,
    );
    await Gestures.waitAndTap(cancelButton, {
      elemDescription: 'Cancel open order button',
      timeout: 15000,
    });
  }

  async isContainerDisplayed(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const headerEl = asDetoxElement(this.header);
        await Assertions.expectElementToBeVisible(headerEl, {
          description: 'Perps market details header visible',
          timeout: 20000,
        });
      },
      appium: async () => {
        const headerEl = await asPlaywrightElement(this.header);
        await headerEl.waitForDisplayed({ timeout: 20000 });
      },
    });
  }

  async tapClosePositionButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.closeButton, {
      description: 'Close position button',
    });
    await UnifiedGestures.waitAndTap(this.confirmCloseButton, {
      description: 'Confirm close position button',
    });
  }

  async closePositionWithRetry(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        if (await isPositionOpen()) {
          await this.tapClosePositionButton();
          await Assertions.expectElementToNotBeVisible(
            asDetoxElement(this.closeButton),
            {
              timeout: 5000,
              description: 'Close button disappears after confirm',
            },
          );
        }
      },
      appium: async () => {
        await Utilities.executeWithRetry(
          async () => {
            if (await isPositionOpen()) {
              await this.tapClosePositionButton();
              const closeEl = await asPlaywrightElement(this.closeButton);
              await closeEl.waitForDisplayed({ reverse: true, timeout: 5000 });
            }
          },
          {
            description: 'close position',
            elemDescription: 'Close position button',
          },
        );
      },
    });
  }
}

export default new PerpsMarketDetailsView();
