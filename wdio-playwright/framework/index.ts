/**
 * Playwright + WebdriverIO Framework
 *
 * This framework combines the best of both worlds:
 * - Playwright's clean API, test runner, and reporting
 * - WebdriverIO's robust element finding, retry mechanisms, and mobile automation
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
  TestFramework,
  FrameworkDetector,
  PlatformDetector,
  asPlaywrightElement,
  asDetoxElement,
} from './EncapsulatedElement';

export { default as UnifiedGestures } from './UnifiedGestures';
