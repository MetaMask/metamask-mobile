import type { ServiceProvider } from '../../services';
import type { PerformanceTracker } from '../../../reporters/PerformanceTracker';
import type { PhaseTimer } from '../../telemetry/PhaseTimer.ts';

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

/**
 * Mutable holder for the worker-scoped Appium/WDIO session.
 * The test-scoped `driver` fixture reads/writes `drv`.
 */
export interface SharedAppiumSession {
  drv?: WebdriverIO.Browser;
}

export interface WorkerLevelFixtures {
  /**
   * Worker-scoped device provider (one instance per Playwright worker/shard).
   */
  deviceProvider: ServiceProvider;

  /**
   * Worker-scoped session holder for reuse across tests.
   */
  sharedSession: SharedAppiumSession;
}

export interface TestLevelFixtures {
  /**
   * Platform detector to be used for the test.
   * This detects the platform of the device being tested.
   */
  currentDeviceDetails: CurrentDeviceDetails;

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

  /**
   * Appium smoke phase timer. Auto-fixture; attaches JSON timings.
   */
  phaseTimer: PhaseTimer;
}
