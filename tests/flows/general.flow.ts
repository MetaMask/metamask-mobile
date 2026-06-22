import { createLogger } from '../framework/logger';
import Assertions from '../framework/Assertions';
import {
  Gestures,
  PlaywrightAssertions,
  PlaywrightGestures,
  PlaywrightMatchers,
} from '../framework';
import Matchers from '../framework/Matchers';
import Utilities, { sleep } from '../framework/Utilities';
import LoginView from '../page-objects/wallet/LoginView';
import { PlatformDetector } from '../framework/PlatformLocator';

const logger = createLogger({
  name: 'GeneralFlow',
});

/**
 * Dismisses development build screens.
 * Handles 'Development servers' and 'Developer menu' screens.
 * These screens are expected to appear when running locally.
 */
export const dismissDevScreens = async (): Promise<void> => {
  const port = process.env.METRO_PORT_E2E || process.env.WATCHER_PORT || '8081';
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
  } catch (error) {
    logger.debug(
      `Dev screens were not dismissed (best effort): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

const getMetroServerUrl = (): string => {
  const port = process.env.METRO_PORT_E2E || process.env.WATCHER_PORT || '8081';
  const host =
    process.env.METRO_HOST_E2E ??
    (PlatformDetector.isAndroid() ? '10.0.2.2' : 'localhost');
  return `http://${host}:${port}`;
};

/**
 * Dismisses the React Native development server picker using Playwright.
 * This screen appears before JS has loaded, so it must run before app bootstrap
 * waits such as the fixture `/state.json` request.
 */
export const dismissDevelopmentServerPickerPlaywright =
  async (): Promise<void> => {
    const serverUrl = getMetroServerUrl();

    try {
      const end = Date.now() + 8000;
      while (Date.now() < end) {
        try {
          const devServerRow =
            await PlaywrightMatchers.getElementByText(serverUrl);
          await PlaywrightAssertions.expectElementToBeVisible(devServerRow, {
            timeout: 1500,
            description: 'Dev Server Row should be visible',
          });
          await PlaywrightGestures.waitAndTap(devServerRow);
          return;
        } catch {
          await sleep(500);
        }
      }
    } catch (error) {
      logger.debug(
        `Playwright development server picker was not dismissed (best effort): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

const closeDeveloperMenuPlaywright = async (): Promise<void> => {
  try {
    const closeButton = await PlaywrightMatchers.getElementById('xmark', {
      exact: true,
    });
    await PlaywrightAssertions.expectElementToBeVisible(closeButton, {
      timeout: 2000,
      description: 'Dev Menu Close Button should be visible',
    });
    await PlaywrightGestures.waitAndTap(closeButton);
    await PlaywrightAssertions.expectElementToNotBeVisible(closeButton, {
      timeout: 5000,
      description: 'Dev Menu Close Button should not be visible',
    });
    return;
  } catch (closeByIdError) {
    logger.debug(
      `Playwright developer menu xmark button was not tapped: ${
        closeByIdError instanceof Error
          ? closeByIdError.message
          : String(closeByIdError)
      }`,
    );
  }

  try {
    const closeButton = await PlaywrightMatchers.getElementByText('Close');
    await PlaywrightAssertions.expectElementToBeVisible(closeButton, {
      timeout: 2000,
      description: 'Dev Menu Close Button should be visible',
    });
    await PlaywrightGestures.waitAndTap(closeButton);
    await PlaywrightAssertions.expectElementToNotBeVisible(closeButton, {
      timeout: 5000,
      description: 'Dev Menu Close Button should not be visible',
    });
    return;
  } catch (closeByTextError) {
    logger.debug(
      `Playwright developer menu Close text was not tapped: ${
        closeByTextError instanceof Error
          ? closeByTextError.message
          : String(closeByTextError)
      }`,
    );
  }

  if (!PlatformDetector.isAndroid()) {
    return;
  }

  try {
    await globalThis.driver?.back();
  } catch (backError) {
    logger.debug(
      `Playwright developer menu Android back dismissal failed: ${
        backError instanceof Error ? backError.message : String(backError)
      }`,
    );
  }
};

const dismissDeveloperMenuOnboardingPlaywright = async (): Promise<void> => {
  try {
    const continueButton =
      await PlaywrightMatchers.getElementByText('Continue');
    await PlaywrightAssertions.expectElementToBeVisible(continueButton, {
      timeout: 5000,
      description: 'Dev Menu Continue Button should be visible',
    });

    await PlaywrightGestures.waitAndTap(continueButton);
  } catch (error) {
    logger.debug(
      `Playwright developer menu onboarding was not dismissed (best effort): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

/**
 * Dismisses the React Native developer menu using Playwright.
 * This runs after the app has bootstrapped and JS is available.
 */
export const dismissDeveloperMenuPlaywright = async (): Promise<void> => {
  await dismissDeveloperMenuOnboardingPlaywright();
  await closeDeveloperMenuPlaywright();
};

/**
 * Waits for app initialization and rehydration to complete.
 * This ensures the app is in a stable state before proceeding with tests.
 * Handles the case where React Native reload triggers state rehydration that may
 * cause the app to briefly log out and return to the login screen.
 *
 * @async
 * @function waitForAppReady
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 20000)
 * @returns {Promise<void>} Resolves when app is ready
 * @throws {Error} Throws an error if app fails to stabilize within timeout
 */
export const waitForAppReady = async (
  timeout: number = 60000,
): Promise<void> => {
  const startTime = Date.now();

  logger.debug('Waiting for app to complete rehydration and stabilize...');

  try {
    // Initial wait for app to finish launching and start rehydration
    await sleep(1000);
    await Utilities.executeWithRetry(
      async () => {
        await Assertions.expectElementToBeVisible(LoginView.container, {
          description: 'Login view should be stable',
          timeout: 3000,
        });

        // Verify it stays visible (not flickering during rehydration)
        await sleep(1500);

        await Assertions.expectElementToBeVisible(LoginView.container, {
          description: 'Login view should remain visible',
          timeout: 2000,
        });
      },
      {
        timeout,
        interval: 2000,
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
