import { createLogger } from '../framework/logger';
import Assertions from '../framework/Assertions';
import { Gestures } from '../framework';
import Matchers from '../framework/Matchers';
import Utilities, { sleep } from '../framework/Utilities';
import LoginView from '../page-objects/wallet/LoginView';

const logger = createLogger({
  name: 'GeneralFlow',
});

/**
 * Dismisses development build screens.
 * Handles 'Development servers' and 'Developer menu' screens.
 * These screens are expected to appear when running locally.
 */
export const dismissDevScreens = async (): Promise<void> => {
  const port = process.env.METRO_PORT_E2E || '8081';
  const host = process.env.METRO_HOST_E2E || 'localhost';
  const serverUrl = `http://${host}:${port}`;

  try {
    // 1. Check for Development Servers screen
    // We tap the server row matching the current metro port
    const devServerRow = Matchers.getElementByText(serverUrl);
    await Assertions.expectElementToBeVisible(devServerRow, {
      timeout: 2000,
      description: 'Dev Server Row should be visible',
    });
    await Gestures.tap(devServerRow, { elemDescription: 'Dev Server Row' });

    // 2. Check for Developer Menu onboarding
    const continueButton = Matchers.getElementByText('Continue');
    await Assertions.expectElementToBeVisible(continueButton, {
      timeout: 5000,
      description: 'Dev Menu Continue Button should be visible',
    });

    // Tap Continue to proceed past the onboarding screen.
    await Gestures.tap(continueButton, {
      elemDescription: 'Dev Menu Continue Button',
    });

    // 3. Close the Developer Menu
    // After tapping Continue, the Developer Menu options list appears.
    // The user provided the ID 'fast-refresh' to tap on.
    const fastRefreshButton = Matchers.getElementByID('fast-refresh');
    await Assertions.expectElementToBeVisible(fastRefreshButton, {
      timeout: 5000,
      description: 'Dev Menu Fast Refresh Button should be visible',
    });
    await Gestures.tap(fastRefreshButton, {
      elemDescription: 'Dev Menu Fast Refresh Button',
    });
  } catch {
    logger.error('Dev screens dismiss error');
  }
};

/**
 * Waits for app initialization and rehydration to complete.
 * This ensures the app is in a stable state before proceeding with tests.
 * Handles the case where React Native reload triggers state rehydration that may
 * cause the app to briefly log out and return to the login screen.
 *
 * @async
 * @function waitForAppReady
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 15000)
 * @returns {Promise<void>} Resolves when app is ready
 * @throws {Error} Throws an error if app fails to stabilize within timeout
 */
export const waitForAppReady = async (
  timeout: number = 15000,
): Promise<void> => {
  const startTime = Date.now();

  logger.debug('Waiting for app to complete rehydration and stabilize...');

  try {
    await sleep(500);
    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectElementToBeVisible(LoginView.container, {
          description: 'Login view should be stable',
          timeout: 2000,
        });

        // Verify it stays visible (not flickering)
        await sleep(1000);

        await Assertions.expectElementToBeVisible(LoginView.container, {
          description: 'Login view should remain visible',
          timeout: 1000,
        });
      },
      {
        timeout,
        description:
          'wait for app to complete rehydration and stabilize on login screen',
      },
    );

    logger.debug(`App ready after ${Date.now() - startTime}ms`);
  } catch (error) {
    logger.error(`App failed to stabilize within ${timeout}ms`, error);
    throw new Error(
      `App did not stabilize on login screen within ${timeout}ms. ` +
        `This may indicate rehydration issues or state corruption.`,
    );
  }
};
