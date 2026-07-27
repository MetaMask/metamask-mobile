/* eslint-disable import-x/no-nodejs-modules, import-x/no-extraneous-dependencies */
import { MobilePlatformDriver } from '@metamask/client-mcp-core';
import { createBackend } from '@metamask/device-mcp';
// eslint-disable-next-line no-duplicate-imports
import type { DeviceBackend } from '@metamask/device-mcp';

import {
  IOSLaunchError,
  type ResolvedIOSLaunchOptions,
} from '../launcher-types';

export interface CreatedIOSDriver {
  driver: MobilePlatformDriver;
  backend: DeviceBackend;
}

/**
 * Creates a MobilePlatformDriver backed by @metamask/device-mcp for iOS.
 *
 * Uses createBackend() which internally creates an IdbBackend for iOS
 * simulators. This replaces the old XCUITestClient/IOSPlatformDriver
 * approach from the previous client-mcp-core version.
 */
export async function createIOSPlatformDriver(
  resolved: ResolvedIOSLaunchOptions,
): Promise<CreatedIOSDriver> {
  try {
    const backend = await createBackend(resolved.simulatorDeviceId, 'ios');
    const driver = new MobilePlatformDriver(backend, resolved.appBundleId);

    return { driver, backend };
  } catch (error) {
    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: error instanceof Error
        ? error.message
        : 'Failed to create iOS platform driver',
    });
  }
}
