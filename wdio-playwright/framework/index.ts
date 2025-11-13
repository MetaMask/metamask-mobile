/**
 * Playwright + WebdriverIO Framework
 *
 * This framework combines the best of both worlds:
 * - Playwright's clean API, test runner, and reporting
 * - WebdriverIO's robust element finding, retry mechanisms, and mobile automation
 *
 * @example
 * import { test } from '../fixture';
 * import { PlaywrightMatchers } from '../framework';
 *
 * test('login flow', async ({ driver }) => {
 *   const username = await PlaywrightMatchers.getByAccessibilityId('username');
 *   await username.fill('user@example.com');
 *
 *   const password = await PlaywrightMatchers.getByAccessibilityId('password');
 *   await password.fill('mypassword');
 *
 *   const loginButton = await PlaywrightMatchers.getByText('Login');
 *   await loginButton.click();
 * });
 */

export { PlaywrightElement, wrapElement, $, $$ } from './PlaywrightAdapter';
export { default as PlaywrightMatchers } from './PlaywrightMatchers';
export { default as PlaywrightGestures } from './PlaywrightGestures';

// Export unified framework (Detox + WebdriverIO compatibility)
export {
  encapsulated,
  EncapsulatedElement,
  type EncapsulatedElementType,
  LocatorStrategy,
  type LocatorConfig,
  type PlatformLocator,
  type AppiumLocatorConfig,
  TestFramework,
  FrameworkDetector,
  PlatformDetector,
  asPlaywrightElement,
  asDetoxElement,
} from './EncapsulatedElement';

export { default as UnifiedGestures } from './UnifiedGestures';
