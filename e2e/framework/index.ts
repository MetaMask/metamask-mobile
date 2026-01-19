// Main framework exports for easy importing
export { default as Assertions } from './Assertions';
export { default as Gestures } from './Gestures';
export { default as Matchers } from './Matchers';
export {
  default as Utilities,
  BASE_DEFAULTS,
  sleep,
  boxedStep,
  getDriver,
} from './Utilities';
export { Logger, createLogger, LogLevel, logger } from './logger';
export { default as PortManager, ResourceType } from './PortManager';
export * from './types';

// Example usage:
// import { Assertions, Gestures, Matchers, sleep, PortManager, ResourceType } from '../framework';

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
  asPlaywrightElement,
  asDetoxElement,
} from './EncapsulatedElement';

export { FrameworkDetector, TestFramework } from './FrameworkDetector';
export { PlatformDetector } from './PlatformLocator';
