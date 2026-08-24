// Main framework exports for easy importing
export { default as Assertions } from './Assertions.ts';
export { default as Gestures } from './Gestures.ts';
export { default as Matchers } from './Matchers.ts';
export { default as Utilities, BASE_DEFAULTS, sleep } from './Utilities.ts';
export {
  default as WebView,
  type AndroidWebViewScrollOptions,
  type AndroidWebViewTapOptions,
  type WebViewByIdOptions,
} from './WebView.ts';
export { Logger, createLogger, LogLevel, logger } from './logger.ts';
export { default as PortManager, ResourceType } from './PortManager.ts';
export * from './types.ts';
export {
  runAnalyticsExpectations,
  assertCapturedMetaMetricsEvents,
  deriveEventNamesForFetch,
  shouldRunAnalyticsExpectations,
} from '../helpers/analytics/runAnalyticsExpectations.ts';
export {
  boxedStep,
  executeMobileDeepLink,
  getDriver,
  withSnapshotSettings,
  startOverheadTracking,
  addOverhead,
  stopOverheadTracking,
  isOverheadTrackingActive,
} from './AppiumUtilities.ts';

// Mock server utilities
export { safeGetBodyText } from '../api-mocking/MockServerE2E.ts';
export {
  countProxiedRequestsMatching,
  waitForAdditionalProxiedRequestsMatching,
  type WaitForAdditionalProxiedRequestsOptions,
} from '../api-mocking/helpers/mockHelpers.ts';

// Dapp server exports for standalone usage (e.g., Playwright tests)
export { default as DappServer } from './DappServer.ts';
export { DappVariants, TestDapps } from './Constants.ts';

// Example usage:
// import { Assertions, Gestures, Matchers, sleep, PortManager, ResourceType } from '../framework';

export {
  AppiumElement,
  wrapElement,
  $,
  $$,
  type AppiumElementRef,
} from './AppiumElement.ts';
export { default as AppiumMatchers } from './AppiumMatchers.ts';
export { default as AppiumGestures } from './AppiumGestures.ts';
export { default as AppiumAssertions } from './AppiumAssertions.ts';

export {
  EncapsulatedElement,
  LocatorStrategy,
  type LocatorConfig,
  type PlatformLocator,
} from './EncapsulatedElement.ts';

export { resolve, isSelector, type Selector } from './Selector.ts';
export { PlatformDetector } from './PlatformLocator.ts';
export {
  DeviceCommandHandler,
  AndroidDeviceCommandHandler,
  IOSDeviceCommandHandler,
  type ClearAppDataOptions,
  type DeviceCommandHandlerOptions,
  type DeviceCommandLogger,
  type InstallAppOptions,
  type IsAppInstalledOptions,
  type PlatformDeviceCommandHandler,
  type ReinstallAppOptions,
  type UninstallAppOptions,
} from './services/device-commands';
export {
  AppiumGestureStrategy,
  type GestureStrategy,
  type UnifiedGestureOptions,
  type TapAtIndexElement,
  type ScrollViewMatcher,
  type ScrollContainer,
} from './GestureStrategy.ts';
