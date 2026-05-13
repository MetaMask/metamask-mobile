import {
  asDetoxElement,
  asPlaywrightElement,
  Assertions,
  encapsulatedAction,
} from '../framework';
import PerpsMarketDetailsView from '../page-objects/Perps/PerpsMarketDetailsView';
import PerpsOrderView from '../page-objects/Perps/PerpsOrderView';

/**
 * Checks if the position is open by checking if the close button is visible.
 * @returns {Promise<boolean>} True if the position is open, false otherwise.
 */
export const isPositionOpen = async (timeout = 5000): Promise<boolean> => {
  let isPositionOpen = false;
  await encapsulatedAction({
    detox: async () => {
      try {
        const el = asDetoxElement(PerpsMarketDetailsView.closeButton);
        await Assertions.expectElementToBeVisible(el, {
          timeout,
          description: 'Close position button',
        });
        isPositionOpen = true;
      } catch {
        isPositionOpen = false;
      }
    },
    appium: async () => {
      try {
        const closeEl = await asPlaywrightElement(
          PerpsMarketDetailsView.closeButton,
        );
        isPositionOpen = await closeEl.isVisible();
      } catch {
        // Element lookup timed out — position is not open
        isPositionOpen = false;
      }
    },
  });
  return isPositionOpen;
};

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
 * @returns {Promise<boolean>} True if the place order button is visible, false otherwise.
 */
export const isPlaceOrderButtonVisible = async (): Promise<boolean> => {
  let visible = false;
  await encapsulatedAction({
    detox: async () => {
      try {
        const el = asDetoxElement(PerpsOrderView.placeOrderButton);
        await Assertions.expectElementToBeVisible(el, {
          timeout: 5000,
          description: 'Place order button',
        });
        visible = true;
      } catch {
        visible = false;
      }
    },
    appium: async () => {
      try {
        const placeOrderButtonEl = await asPlaywrightElement(
          PerpsOrderView.placeOrderButton,
        );
        visible = await placeOrderButtonEl.isVisible();
      } catch {
        visible = false;
      }
    },
  });
  return visible;
};

/**
 * Waits for the order screen to be visible.
 * @param timeout - The timeout in milliseconds.
 * @param interval - The interval in milliseconds.
 * @returns {Promise<void>} Resolves when the order screen is visible.
 */
export const waitForOrderScreenVisible = async (
  timeout = 20000,
  interval = 1000,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await isPlaceOrderButtonVisible()) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Order screen not visible after ${timeout}ms`);
};
