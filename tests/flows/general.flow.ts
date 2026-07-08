import { createLogger } from '../framework/logger';
import Assertions from '../framework/Assertions';
import {
  FrameworkDetector,
  Gestures,
  PlaywrightAssertions,
  PlaywrightGestures,
  PlaywrightMatchers,
} from '../framework';
import Matchers from '../framework/Matchers';
import Utilities, { sleep } from '../framework/Utilities';
import LoginView from '../page-objects/wallet/LoginView';
import WalletView from '../page-objects/wallet/WalletView';
import { PlatformDetector } from '../framework/PlatformLocator';
import { resolveE2EWaitTimeoutMs } from '../framework/Constants';
import {
  isLoginScreenDisplayed,
  isWalletHomeReadyOnAndroid,
  isWalletHomeReadyOnIOS,
} from './wallet-home-readiness';
// eslint-disable-next-line import-x/no-nodejs-modules
import { execSync } from 'node:child_process';

const logger = createLogger({
  name: 'GeneralFlow',
});

const DEV_MENU_PROBE_TIMEOUT_MS = 800;

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
      timeout: DEV_MENU_PROBE_TIMEOUT_MS,
      description: 'Dev Menu Close Button should be visible',
    });
    await PlaywrightGestures.waitAndTap(closeButton);
    await PlaywrightAssertions.expectElementToNotBeVisible(closeButton, {
      timeout: 2000,
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
      timeout: DEV_MENU_PROBE_TIMEOUT_MS,
      description: 'Dev Menu Close Button should be visible',
    });
    await PlaywrightGestures.waitAndTap(closeButton);
    await PlaywrightAssertions.expectElementToNotBeVisible(closeButton, {
      timeout: 2000,
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
};

const dismissDeveloperMenuOnboardingPlaywright = async (): Promise<void> => {
  try {
    const continueButton =
      await PlaywrightMatchers.getElementByText('Continue');
    await PlaywrightAssertions.expectElementToBeVisible(continueButton, {
      timeout: DEV_MENU_PROBE_TIMEOUT_MS,
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
 * Collapses the Android notification shade / Quick Settings panel.
 * Accidental status-bar swipes during launch or gestures can leave the shade
 * open and block all in-app interactions.
 */
export const dismissAndroidSystemOverlaysPlaywright =
  async (): Promise<void> => {
    if (!PlatformDetector.isAndroid()) {
      return;
    }

    const serial = process.env.ANDROID_DEVICE_UDID?.trim();
    const adbFlag = serial ? `-s ${serial}` : '';

    try {
      execSync(`adb ${adbFlag} shell cmd statusbar collapse`, {
        stdio: 'ignore',
      });
      logger.debug('Collapsed Android status bar via adb shell');
    } catch (error) {
      logger.debug(
        `statusbar collapse failed (best effort): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

export type AppReadyScreen = 'login' | 'wallet';

/**
 * Waits for app initialization and rehydration to complete.
 * This ensures the app is in a stable state before proceeding with tests.
 * Handles the case where React Native reload triggers state rehydration that may
 * cause the app to briefly log out and return to the login screen.
 *
 * @async
 * @function waitForAppReady
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 20000)
 * @returns {Promise<AppReadyScreen>} Which screen the app stabilized on
 * @throws {Error} Throws an error if app fails to stabilize within timeout
 */
export const waitForAppReady = async (
  timeout: number = resolveE2EWaitTimeoutMs(60_000),
): Promise<AppReadyScreen> => {
  const startTime = Date.now();
  const deadline = startTime + timeout;
  const pollIntervalMs = FrameworkDetector.isAppium() ? 500 : 2000;

  logger.debug('Waiting for app to reach login or wallet home...');

  while (Date.now() < deadline) {
    if (FrameworkDetector.isAppium() && PlatformDetector.isIOS()) {
      if (await isWalletHomeReadyOnIOS()) {
        logger.debug(
          `App on wallet home after ${Date.now() - startTime}ms (iOS readiness) — skipping login wait`,
        );
        return 'wallet';
      }
    } else if (FrameworkDetector.isAppium() && PlatformDetector.isAndroid()) {
      // Android Appium: probe login before wallet-screen. The wallet container
      // may exist in the native tree while the lock screen is showing.
      if (await isLoginScreenDisplayed()) {
        await sleep(500);
        if (await isLoginScreenDisplayed()) {
          logger.debug(`App ready on login after ${Date.now() - startTime}ms`);
          return 'login';
        }
      }
      if (await isWalletHomeReadyOnAndroid()) {
        logger.debug(
          `App on wallet home after ${Date.now() - startTime}ms — skipping login wait`,
        );
        return 'wallet';
      }
    } else {
      try {
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet home should be visible',
          timeout: 3000,
        });
        logger.debug(
          `App on wallet home after ${Date.now() - startTime}ms — skipping login wait`,
        );
        return 'wallet';
      } catch {
        // Not on wallet yet.
      }
    }

    if (!(FrameworkDetector.isAppium() && PlatformDetector.isAndroid())) {
      try {
        await Assertions.expectElementToBeVisible(LoginView.container, {
          description: 'Login view should be stable',
          timeout: 3000,
        });
        await sleep(500);
        await Assertions.expectElementToBeVisible(LoginView.container, {
          description: 'Login view should remain visible',
          timeout: 1500,
        });
        logger.debug(`App ready on login after ${Date.now() - startTime}ms`);
        return 'login';
      } catch {
        // Still booting — keep polling.
      }
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `App did not reach login or wallet home within ${timeout}ms. ` +
      `This may indicate rehydration issues or state corruption.`,
  );
};
