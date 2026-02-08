// Main framework exports for easy importing
export { default as Assertions } from './Assertions.ts';
export { default as Gestures } from './Gestures.ts';
export { default as Matchers } from './Matchers.ts';
export {
  default as Utilities,
  BASE_DEFAULTS,
  sleep,
  boxedStep,
  getDriver,
} from './Utilities.ts';
export { Logger, createLogger, LogLevel, logger } from './logger.ts';
export { default as PortManager, ResourceType } from './PortManager.ts';
export * from './types.ts';

// Dapp server exports for standalone usage (e.g., Appwright tests)
export { default as DappServer } from './DappServer.ts';
export { DappVariants, TestDapps } from './Constants.ts';

// Example usage:
// import { Assertions, Gestures, Matchers, sleep, PortManager, ResourceType } from '../framework';

export { PlaywrightElement, wrapElement, $, $$ } from './PlaywrightAdapter.ts';
export { default as PlaywrightMatchers } from './PlaywrightMatchers.ts';
export { default as PlaywrightGestures } from './PlaywrightGestures.ts';

// Export unified framework (Detox + WebdriverIO compatibility)
export {
  encapsulated,
  EncapsulatedElement,
  type EncapsulatedElementType,
  LocatorStrategy,
  type LocatorConfig,
  type PlatformLocator,
  asPlaywrightElement,
  asDetoxElement,
} from './EncapsulatedElement.ts';

export { FrameworkDetector, TestFramework } from './FrameworkDetector.ts';
export { PlatformDetector } from './PlatformLocator.ts';
