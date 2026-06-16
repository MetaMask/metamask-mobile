import type { ServiceProvider } from '../../services';
import type { PerformanceTracker } from '../../../reporters/PerformanceTracker';

export interface CurrentDeviceDetails {
  platform: 'android' | 'ios';
  deviceName: string;
  /**
   * Android: adb serial (e.g. `emulator-5554`) after AVD name resolution.
   * iOS: simulator UDID resolved from the display name at fixture time (prefers the Booted one).
   */
  udid?: string;
  packageName?: string;
  appId?: string;
  launchableActivity?: string;
  /** Derived from `use.device.provider === ProviderName.BROWSERSTACK` in Playwright config. */
  isBrowserstack: boolean;
}

export interface TestLevelFixtures {
  /**
   * Platform detector to be used for the test.
   * This detects the platform of the device being tested.
   */
  currentDeviceDetails: CurrentDeviceDetails;

  /**
   * Device provider to be used for the test.
   * This creates and manages the device lifecycle for the test
   */
  deviceProvider: ServiceProvider;

  /**
   * The device instance that will be used for running the test.
   * This provides the functionality to interact with the device
   * during the test.
   */
  driver: WebdriverIO.Browser;

  /**
   * Performance tracker to be used for the test.
   * This collects and attaches performance metrics to the test.
   * It also handles quality gate validation and Sentry publishing.
   */
  performanceTracker: PerformanceTracker;
}
