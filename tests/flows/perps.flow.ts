import { Assertions, Gestures, Matchers, Utilities } from '../framework';
import { computeProLimitPriceForPercentPreset } from '../helpers/perps/perps-smoke-helpers';
import { PerpsOrderViewSelectorsIDs } from '../../app/components/UI/Perps/Perps.testIds';
import PerpsHomeView from '../page-objects/Perps/PerpsHomeView';
import PerpsMarketDetailsView from '../page-objects/Perps/PerpsMarketDetailsView';
import PerpsMarketListView from '../page-objects/Perps/PerpsMarketListView';
import PerpsOnboarding from '../page-objects/Perps/PerpsOnboarding';
import PerpsOrderView from '../page-objects/Perps/PerpsOrderView';
import PerpsProMarketView from '../page-objects/Perps/PerpsProMarketView';
import TransactionPayConfirmation from '../page-objects/Confirmation/TransactionPayConfirmation';
import WalletView from '../page-objects/wallet/WalletView';

const PERPS_GTM_MODAL_FALLBACK_WAIT_MS = 10_000;
const PERPS_NOTIFICATION_TOOLTIP_WAIT_MS = 15_000;

/**
 * Resolves whether the Perps GTM onboarding tutorial should be handled.
 * Uses feature flags when available; otherwise polls the tutorial for up to 10s.
 */
export const resolvePerpsGtmOnboardingModalEnabled = async (
  productionFeatureFlags: Record<string, unknown> | null,
): Promise<boolean> => {
  const flagsSayEnabled =
    productionFeatureFlags != null &&
    (
      productionFeatureFlags.perpsPerpGtmOnboardingModalEnabled as {
        enabled?: boolean;
      }
    )?.enabled === true;

  if (flagsSayEnabled) {
    return true;
  }

  // Flags missing or disabled — tutorial may still appear; detect in UI.
  try {
    await Assertions.expectElementToBeVisible(PerpsOnboarding.tutorialTitle, {
      timeout: PERPS_GTM_MODAL_FALLBACK_WAIT_MS,
      description: 'Perps GTM onboarding tutorial',
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Skips the Perps onboarding tutorial when it is on screen. No-op if not shown.
 */
export const dismissPerpsOnboardingTutorialIfPresent =
  async (): Promise<void> => {
    try {
      await Assertions.expectElementToBeVisible(PerpsOnboarding.skipButton, {
        timeout: PERPS_GTM_MODAL_FALLBACK_WAIT_MS,
        description: 'Perps onboarding skip button',
      });
      await Gestures.waitAndTap(PerpsOnboarding.skipButton, {
        checkForDisplayed: true,
        checkEnabled: true,
        timeout: 10_000,
      });
      await Assertions.expectElementToNotBeVisible(PerpsOnboarding.skipButton, {
        timeout: 10_000,
        description: 'Perps onboarding skip button should close',
      });
    } catch {
      // Tutorial not shown or already dismissed.
    }
  };

/**
 * Dismisses the post-order "Turn on notifications" bottom sheet when shown.
 * Blocks navigation until closed (first successful perps order with push disabled).
 */
export const dismissPerpsNotificationTooltipIfPresent =
  async (): Promise<void> => {
    const turnOnTestId = PerpsOrderViewSelectorsIDs.TURN_ON_NOTIFICATION_BUTTON;

    try {
      const turnOnEl = Matchers.getElementByID(turnOnTestId);
      await Assertions.expectElementToBeVisible(turnOnEl, {
        timeout: PERPS_NOTIFICATION_TOOLTIP_WAIT_MS,
        description: 'Perps notification tooltip',
      });
      await Gestures.waitAndTap(turnOnEl, {
        checkForDisplayed: true,
        timeout: 10_000,
      });
      await Assertions.expectElementToNotBeVisible(turnOnEl, {
        timeout: 10_000,
        description: 'Perps notification tooltip should close',
      });
    } catch {
      // Tooltip not shown.
    }
  };

/**
 * Checks if the position is open by checking if the close button is visible.
 * @returns {Promise<boolean>} True if the position is open, false otherwise.
 */
export const isPositionOpen = async (timeout = 5000): Promise<boolean> =>
  Utilities.isElementVisible(PerpsMarketDetailsView.closeButton, timeout);

export const waitForPositionOpen = async (
  timeout = 20000,
  interval = 1000,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await isPositionOpen()) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Position not open after ${timeout}ms`);
};

/**
 * Checks if the place order button is visible.
 * @returns {Promise<boolean>} True if the place order button is visible.
 */
export const isPlaceOrderButtonVisible = async (): Promise<boolean> =>
  Utilities.isElementVisible(PerpsOrderView.placeOrderButton, 5000);

/**
 * Waits for the order screen to be visible.
 * @param timeout - The timeout in milliseconds.
 * @param interval - The interval in milliseconds.
 * @returns {Promise<void>} Resolves when the order screen is visible.
 */
export const waitForOrderScreenVisible = async (
  timeout = 45000,
  interval = 1000,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await isPlaceOrderButtonVisible()) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Order screen not visible after ${timeout}ms`);
};

export type PerpsPositionDirection = 'long' | 'short';

export type PerpsLimitPricePreset = 'Mid' | 'Bid' | 'Ask' | number;

/**
 * Opens Perps from the wallet home, selects a watchlist market, and taps Long/Short.
 */
export const navigateToPerpsOrderEntry = async (
  symbol: string,
  direction: PerpsPositionDirection,
): Promise<void> => {
  await WalletView.scrollAndTapPerpsSection();
  await PerpsMarketListView.selectMarketAndTapOrderSide(symbol, direction);
};

/**
 * Opens Perps from the wallet home and taps the Withdraw CTA, retrying until the
 * MetaMask Pay custom-amount confirmation is reached. The first tap can land
 * while Perps is still settling; reaching this confirmation (instead of the
 * legacy PerpsWithdrawView) is what proves the withdraw-to-any-token flow.
 *
 * Requires the `confirmations_pay_post_quote` → `perpsWithdraw` flag enabled.
 */
export const openPerpsWithdrawPayConfirmation = async (): Promise<void> => {
  await WalletView.scrollAndTapPerpsSection();
  await PerpsHomeView.waitForWithdrawButton();

  await Utilities.executeWithRetry(
    async () => {
      await PerpsHomeView.tapWithdrawButton();
      await Assertions.expectElementToBeVisible(
        TransactionPayConfirmation.keyboardContainer,
        {
          description:
            'MetaMask Pay withdraw confirmation reached after tapping Withdraw',
          timeout: 5000,
        },
      );
    },
    { interval: 1000, timeout: 30000 },
  );
};

/**
 * Navigates to order entry, selects Limit, applies a price preset, confirms, and places the order.
 */
export const placeLimitOrderAtPreset = async (
  symbol: string,
  direction: PerpsPositionDirection,
  preset: PerpsLimitPricePreset = 'Mid',
): Promise<void> => {
  await navigateToPerpsOrderEntry(symbol, direction);
  await waitForOrderScreenVisible();
  await PerpsOrderView.openOrderTypeSelector();
  await PerpsOrderView.selectLimitOrderType();

  if (typeof preset === 'number') {
    await PerpsOrderView.setLimitPricePresetPercent(preset);
  } else if (preset === 'Mid') {
    await PerpsOrderView.setLimitPricePreset(preset);
  } else {
    await PerpsOrderView.setLimitPricePresetNamed(preset);
  }

  await PerpsOrderView.confirmLimitPrice();
  await PerpsOrderView.tapPlaceOrderButton();
  await dismissPerpsNotificationTooltipIfPresent();
  await PerpsMarketDetailsView.waitForScreenReady();
  await PerpsMarketDetailsView.expectCompactOpenOrderVisible({ direction });
};

export const openPosition = async (
  symbol: string,
  direction: PerpsPositionDirection,
): Promise<void> => {
  await navigateToPerpsOrderEntry(symbol, direction);
  // Wait for order screen + fees row before tap
  await waitForOrderScreenVisible();
  await PerpsOrderView.waitForFeesReady();
  await PerpsOrderView.tapPlaceOrderButton();
  await dismissPerpsNotificationTooltipIfPresent();
  await PerpsMarketDetailsView.waitForScreenReady();
  await PerpsMarketDetailsView.expectClosePositionButtonVisible();
};

/**
 * From Perps home (Lite mode), switches to Pro mode and waits for the Pro view.
 * Handles the optional mode-selection bottom sheet confirmation.
 */
export const switchToPerpsProMode = async (): Promise<void> => {
  await PerpsProMarketView.switchToProMode();
};

/**
 * Opens Perps from the wallet home, selects the market in Lite, then switches
 * to Pro. Selecting first avoids landing on the default Pro market (BTC) and
 * trying to tap a list row that is not on screen.
 */
export const navigateToPerpsProEntry = async (
  symbol: string,
): Promise<void> => {
  await WalletView.scrollAndTapPerpsSection();
  await dismissPerpsOnboardingTutorialIfPresent();
  await PerpsMarketListView.selectMarket(symbol);
  await switchToPerpsProMode();
  await PerpsProMarketView.waitForProViewReady();
};

/**
 * Places a market order in Pro mode and waits for the position to appear in
 * the Pro positions panel.
 */
export const openPositionInPro = async (
  symbol: string,
  direction: PerpsPositionDirection,
): Promise<void> => {
  await PerpsProMarketView.selectDirection(direction);
  await PerpsProMarketView.enterSize('500');
  await PerpsProMarketView.waitForFeesReady();
  await PerpsProMarketView.tapPlaceOrderButton();
  await dismissPerpsNotificationTooltipIfPresent();
  await PerpsProMarketView.waitForPositionRow(symbol);
};

/**
 * Places a limit order at Mid price in Pro mode and verifies the order row
 * appears in the Orders tab of the Pro positions panel.
 */
export const placeLimitOrderInPro = async (
  symbol: string,
  direction: PerpsPositionDirection,
  preset: PerpsLimitPricePreset = 'Mid',
): Promise<void> => {
  await PerpsProMarketView.selectDirection(direction);
  await PerpsProMarketView.enterSize('500');
  await PerpsProMarketView.tapOrderTypeButton();
  await PerpsProMarketView.selectLimitOrderType();

  if (preset === 'Mid') {
    await PerpsProMarketView.tapMidPriceButton();
  } else if (typeof preset === 'number') {
    await PerpsProMarketView.enterLimitPrice(
      computeProLimitPriceForPercentPreset(preset),
    );
  }

  await PerpsProMarketView.tapPlaceOrderButton();
  await dismissPerpsNotificationTooltipIfPresent();
  await PerpsProMarketView.tapOrdersTab();
  await PerpsProMarketView.waitForOrderRow(symbol, 0);
};
