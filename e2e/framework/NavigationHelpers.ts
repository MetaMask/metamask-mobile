/**
 * Navigation Helpers with Automatic Screenshot Capture
 *
 * This module provides utilities for wrapping navigation actions with automatic screenshot capture.
 * Use these helpers when you want to document navigation flows in your tests.
 */

import Utilities from './Utilities';

/**
 * Options for navigation with screenshot capture
 */
export interface NavigationWithScreenshotOptions {
  /** Name describing the navigation action (e.g., "navigate-to-settings") */
  name: string;
  /** Whether to capture screenshot before navigation */
  captureBeforeAction?: boolean;
  /** Whether to capture screenshot after navigation */
  captureAfterAction?: boolean;
  /** Optional prefix for screenshot names */
  screenshotPrefix?: string;
  /** Timeout for the navigation action */
  timeout?: number;
}

/**
 * Wraps a navigation function with automatic screenshot capture
 *
 * @example
 * ```typescript
 * await withNavigationScreenshots(
 *   async () => {
 *     await TabBarComponent.tapBrowser();
 *   },
 *   {
 *     name: 'navigate-to-browser',
 *     captureAfterAction: true,
 *   }
 * );
 * ```
 */
export async function withNavigationScreenshots<T>(
  navigationFn: () => Promise<T>,
  options: NavigationWithScreenshotOptions,
): Promise<T> {
  const {
    name,
    captureBeforeAction = false,
    captureAfterAction = true,
    screenshotPrefix = 'navigation',
    timeout = 15000,
  } = options;

  return Utilities.executeWithScreenshot(navigationFn, {
    name,
    captureBeforeAction,
    captureAfterAction,
    screenshotPrefix,
    timeout,
  });
}

/**
 * Creates a navigation function wrapper that always captures screenshots
 * Useful for creating reusable navigation methods that always document their actions
 *
 * @example
 * ```typescript
 * const navigateToBrowser = createScreenshotNavigationWrapper(
 *   async () => await TabBarComponent.tapBrowser(),
 *   'navigate-to-browser'
 * );
 *
 * // Later in your test:
 * await navigateToBrowser();
 * ```
 */
export function createScreenshotNavigationWrapper<T>(
  navigationFn: () => Promise<T>,
  name: string,
  options: Omit<NavigationWithScreenshotOptions, 'name'> = {},
): () => Promise<T> {
  return async () =>
    withNavigationScreenshots(navigationFn, {
      name,
      ...options,
    });
}

/**
 * Helper to capture a screenshot with a descriptive name
 * This is a convenience wrapper around Utilities.takeScreenshot
 *
 * @example
 * ```typescript
 * await captureScreenshot('home-screen-loaded');
 * ```
 */
export async function captureScreenshot(
  name: string,
  options: { prefix?: string; timestamp?: boolean } = {},
): Promise<string> {
  return Utilities.takeScreenshot(name, options);
}

/**
 * Capture screenshots at multiple stages of a multi-step navigation
 *
 * @example
 * ```typescript
 * await captureNavigationFlow('settings-flow', [
 *   { name: 'tap-hamburger', action: async () => await WalletView.tapBurgerIcon() },
 *   { name: 'open-settings', action: async () => await WalletView.tapSettings() },
 *   { name: 'settings-loaded', action: async () => await Assertions.checkIfVisible(SettingsView.container) },
 * ]);
 * ```
 */
export async function captureNavigationFlow(
  flowName: string,
  steps: { name: string; action: () => Promise<void> }[],
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await Utilities.executeWithScreenshot(step.action, {
      name: `${flowName}-step-${i + 1}-${step.name}`,
      captureAfterAction: true,
      screenshotPrefix: flowName,
      timeout: 15000,
    });
  }
}
