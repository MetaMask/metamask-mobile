import type { DeviceInfo } from '../types';

/**
 * Static helper for extracting device information from Playwright test objects.
 * Tries multiple paths and falls back to environment variables or defaults.
 */
export class DeviceInfoExtractor {
  /**
   * Extract device info from a Playwright test case, trying multiple resolution paths.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static extract(test: any): DeviceInfo {
    // Path 1: test.parent.project.use.device
    if (test?.parent?.project?.use?.device) {
      return test.parent.project.use.device;
    }
    // Path 2: test.project.use.device
    if (test?.project?.use?.device) {
      return test.project.use.device;
    }
    // Path 3: test.use.device
    if (test?.use?.device) {
      return test.use.device;
    }

    // Fallback to environment variables
    if (
      process.env.BROWSERSTACK_DEVICE &&
      process.env.BROWSERSTACK_OS_VERSION
    ) {
      return {
        name: process.env.BROWSERSTACK_DEVICE,
        osVersion: process.env.BROWSERSTACK_OS_VERSION,
        provider: 'browserstack',
      };
    }

    return {
      name: 'Unknown',
      osVersion: 'Unknown',
      provider: 'unknown',
    };
  }
}
