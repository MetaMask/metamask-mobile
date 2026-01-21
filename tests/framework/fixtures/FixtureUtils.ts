/* eslint-disable import/no-nodejs-modules */
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  type Caip25CaveatValue,
  type InternalScopesObject,
} from '@metamask/chain-agnostic-permission';

import { createLogger } from '../logger';
import PortManager, { ResourceType } from '../PortManager';
import { Resource } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  FALLBACK_FIXTURE_SERVER_PORT,
  FALLBACK_COMMAND_QUEUE_SERVER_PORT,
  FALLBACK_MOCKSERVER_PORT,
  FALLBACK_GANACHE_PORT,
  FALLBACK_DAPP_SERVER_PORT,
} from '../Constants';
import { DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager';
import { PlatformDetector } from '../PlatformLocator';
import { FrameworkDetector } from '../FrameworkDetector';

const execAsync = promisify(exec);

const logger = createLogger({
  name: 'FixtureUtils',
});

/**
 * Maps ResourceType to fallback port.
 * These ports are used in fixture data and are mapped to actual allocated ports
 * via adb reverse on Android or overridden via LaunchArgs on iOS.
 *
 * @param resourceType - The type of resource
 * @returns The fallback port for the resource
 */
function getFallbackPort(resourceType: ResourceType): number {
  switch (resourceType) {
    case ResourceType.FIXTURE_SERVER:
      return FALLBACK_FIXTURE_SERVER_PORT;
    case ResourceType.COMMAND_QUEUE_SERVER:
      return FALLBACK_COMMAND_QUEUE_SERVER_PORT;
    case ResourceType.MOCK_SERVER:
      return FALLBACK_MOCKSERVER_PORT;
    case ResourceType.GANACHE:
      return FALLBACK_GANACHE_PORT;
    case ResourceType.ANVIL:
      return DEFAULT_ANVIL_PORT;
    case ResourceType.DAPP_SERVER:
      return FALLBACK_DAPP_SERVER_PORT;
    default:
      throw new Error(`No fallback port defined for ${resourceType}`);
  }
}

/**
 * Removes specific test port bindings for the current device.
 * This is called at the start of tests to clean up any stale bindings from previous failed tests.
 *
 * IMPORTANT: We only remove known fallback ports to avoid interfering with Detox's
 * own port management. Using --remove-all would remove Detox's ports and cause errors.
 */
export async function cleanupAllAndroidPortForwarding(): Promise<void> {
  // Only remove port forwarding on Android
  if (!(await PlatformDetector.isAndroid())) {
    return;
  }

  // Skip on BrowserStack
  if (isBrowserStack()) {
    return;
  }

  // Get device ID to target specific device (important for CI with multiple devices)
  // In Detox: use device.id for multi-device support
  // In Appium/Playwright: skip device flag (single emulator assumption)
  let deviceFlag = '';
  if (FrameworkDetector.isDetox()) {
    const deviceId = device.id || '';
    deviceFlag = deviceId ? `-s ${deviceId}` : '';
  }

  // Clean up only the specific fallback ports we use
  // This prevents conflicts with Detox's own port management
  const fallbackPorts = [
    FALLBACK_FIXTURE_SERVER_PORT, // 12345
    FALLBACK_COMMAND_QUEUE_SERVER_PORT, // 12346
    FALLBACK_MOCKSERVER_PORT, // 8000
    FALLBACK_GANACHE_PORT, // 8546
    DEFAULT_ANVIL_PORT, // 8545
    FALLBACK_DAPP_SERVER_PORT, // 8085
    FALLBACK_DAPP_SERVER_PORT + 1, // 8086 (dapp-server-1)
    FALLBACK_DAPP_SERVER_PORT + 2, // 8087 (dapp-server-2)
  ];

  logger.debug('Cleaning up test port forwards before test...');

  for (const port of fallbackPorts) {
    try {
      const command = `adb ${deviceFlag} reverse --remove tcp:${port}`;
      await execAsync(command);
      logger.debug(`✓ Removed port forwarding for tcp:${port}`);
    } catch (error) {
      // Silently ignore "not found" errors - the port might not have been forwarded
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('not found')) {
        logger.debug(`Note: Could not remove tcp:${port}: ${errorMessage}`);
      }
    }
  }

  logger.debug('✓ Cleaned up test port forwarding');
}

/**
 * Sets up adb reverse for Android to map fallback port to actual allocated port.
 *
 * WHY THIS IS NEEDED:
 * - iOS: LaunchArgs work → app receives actual allocated ports at runtime
 * - Android: LaunchArgs DON'T work → app always uses fallback ports
 * - Solution: Use adb reverse ONLY for ports that would be passed via LaunchArgs
 *
 * IMPORTANT: We only forward LaunchArgs ports (fixture server, command queue server, mock server).
 * Other resources (Ganache, Anvil, Dapps) are accessed through MockServer proxy which handles
 * port translation, so they don't need adb reverse.
 * References:
 * https://github.com/expo/expo/issues/31830
 * https://github.com/expo/expo/pull/37172
 *
 * @param resourceType - The type of resource
 * @param actualPort - The actual port allocated by PortManager
 * @param instanceIndex - Optional instance index for multi-instance resources (e.g., dapp-server-0 uses index 0)
 */
async function setupAndroidPortForwarding(
  resourceType: ResourceType,
  actualPort: number,
  instanceIndex?: number,
): Promise<void> {
  try {
    // Only set up port forwarding on Android
    if (!(await PlatformDetector.isAndroid())) {
      return;
    }

    // Skip adb reverse on BrowserStack - BrowserStack Local tunnel handles port forwarding
    if (isBrowserStack()) {
      logger.info(
        `BrowserStack mode: Skipping adb reverse for ${resourceType} (port ${actualPort} forwarded via tunnel)`,
      );
      return;
    }

    // Forward all dynamically allocated ports that the app needs to access
    // - LaunchArgs ports: Android doesn't support LaunchArgs, needs adb reverse
    // - Dapp servers: Browser navigation bypasses MockServer, needs adb reverse
    // - Ganache/Anvil: Even though fixture is updated, some code paths may use fallback ports
    const forwardedResources = [
      ResourceType.FIXTURE_SERVER,
      ResourceType.COMMAND_QUEUE_SERVER,
      ResourceType.MOCK_SERVER,
      ResourceType.DAPP_SERVER,
      ResourceType.GANACHE,
      ResourceType.ANVIL,
    ];

    if (!forwardedResources.includes(resourceType)) {
      return;
    }

    // Calculate the correct fallback port for multi-instance resources
    let fallbackPort = getFallbackPort(resourceType);
    if (
      resourceType === ResourceType.DAPP_SERVER &&
      instanceIndex !== undefined
    ) {
      fallbackPort += instanceIndex;
    }

    // Get device ID to target specific device (important for CI with multiple devices)
    // In Detox: use device.id for multi-device support
    // In Appium/Playwright: skip device flag (single emulator assumption)
    let deviceFlag = '';
    if (FrameworkDetector.isDetox()) {
      const deviceId = device.id || '';
      deviceFlag = deviceId ? `-s ${deviceId}` : '';
    }

    const command = `adb ${deviceFlag} reverse tcp:${fallbackPort} tcp:${actualPort}`;

    logger.debug(`Executing port forward: ${command}`);
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('')) {
      logger.warn(`adb reverse stderr: ${stderr}`);
    }
    if (stdout) {
      logger.debug(`adb reverse stdout: ${stdout}`);
    }

    logger.debug(
      `✓ Android port forwarding: ${fallbackPort} → ${actualPort} (${resourceType}${instanceIndex !== undefined ? `:${instanceIndex}` : ''})`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Failed to set up Android port forwarding for ${resourceType}: ${errorMessage}`,
    );
    logger.error('Error details:', error);
    throw error;
  }
}

/**
 * Starts a resource with automatic port retry logic.
 *
 * This function handles the race condition where a port appears available
 * but becomes occupied before the resource can bind to it. It will retry
 * with a new port if the start fails with EADDRINUSE.
 */
export async function startResourceWithRetry(
  resourceType: ResourceType,
  resource: Resource,
  maxRetries: number = 3,
): Promise<number> {
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt <= maxRetries) {
    try {
      const allocation =
        await PortManager.getInstance().allocatePort(resourceType);

      // Set up Android port forwarding before starting the resource
      await setupAndroidPortForwarding(resourceType, allocation.port);

      resource.setServerPort(allocation.port);
      await resource.start();

      logger.debug(
        `✓ Resource ${resourceType} started successfully on port ${allocation.port}`,
      );
      return allocation.port;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = (
        error instanceof Error ? error.message : String(error)
      ).toLowerCase();

      // Get the failed port before releasing
      const failedPort = PortManager.getInstance().getPort(resourceType);

      // Release the failed port allocation
      if (failedPort !== undefined) {
        PortManager.getInstance().releasePort(resourceType);
      }

      // Check if it's a port conflict error that we should retry
      if (
        attempt < maxRetries &&
        (errorMessage.includes('eaddrinuse') ||
          errorMessage.includes('address already in use'))
      ) {
        attempt++;
        logger.debug(
          `Port ${failedPort} conflict for ${resourceType}, retrying with new random port (${attempt}/${maxRetries})`,
        );
        continue;
      }

      // Non-retryable error or max retries reached
      logger.error(
        `Failed to start ${resourceType} after ${attempt} attempts:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  throw new Error(
    `Failed to start ${resourceType} after ${maxRetries} retries: ${lastError?.message}`,
  );
}

/**
 * Starts a multi-instance resource with automatic port retry logic.
 *
 * Similar to startResourceWithRetry but for resources that can have multiple instances
 * (e.g., multiple dapp servers). Uses multi-instance port allocation.
 */
export async function startMultiInstanceResourceWithRetry(
  resourceType: ResourceType,
  instanceId: string,
  resource: Resource,
  maxRetries: number = 3,
): Promise<number> {
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt <= maxRetries) {
    try {
      const allocation =
        await PortManager.getInstance().allocateMultiInstancePort(
          resourceType,
          instanceId,
        );

      // Extract instance index from instanceId (e.g., "dapp-server-1" -> 1)
      const instanceIndex = parseInt(instanceId.split('-').pop() || '0', 10);

      // Set up Android port forwarding before starting the resource
      await setupAndroidPortForwarding(
        resourceType,
        allocation.port,
        instanceIndex,
      );

      resource.setServerPort(allocation.port);
      await resource.start();

      logger.debug(
        `✓ Multi-instance resource ${resourceType}:${instanceId} started successfully on port ${allocation.port}`,
      );
      return allocation.port;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = (
        error instanceof Error ? error.message : String(error)
      ).toLowerCase();

      // Get the failed port before releasing
      const failedPort = PortManager.getInstance().getMultiInstancePort(
        resourceType,
        instanceId,
      );

      // Release the failed port allocation
      if (failedPort !== undefined) {
        PortManager.getInstance().releaseMultiInstancePort(
          resourceType,
          instanceId,
        );
      }

      // Check if it's a port conflict error that we should retry
      if (
        attempt < maxRetries &&
        (errorMessage.includes('eaddrinuse') ||
          errorMessage.includes('address already in use'))
      ) {
        attempt++;
        logger.debug(
          `Port ${failedPort} conflict for ${resourceType}:${instanceId}, retrying with new random port (${attempt}/${maxRetries})`,
        );
        continue;
      }

      // Non-retryable error or max retries reached
      logger.error(
        `Failed to start ${resourceType}:${instanceId} after ${attempt} attempts:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  throw new Error(
    `Failed to start ${resourceType}:${instanceId} after ${maxRetries} retries: ${lastError?.message}`,
  );
}

/**
 * Determines if tests are running on BrowserStack with local tunnel enabled.
 *
 * This function provides consistent BrowserStack detection used by both
 * getServerPort() and getLocalHost() to ensure matching host/port configurations.
 *
 * Handles environment variable patterns:
 * - BROWSERSTACK_LOCAL=true → true
 * - BROWSERSTACK_LOCAL=false → false
 * - BROWSERSTACK_LOCAL="" → false
 * - BROWSERSTACK_LOCAL unset → false
 *
 * @returns True when BrowserStack local tunnel is enabled
 */
function isBrowserStack() {
  return process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true';
}

/**
 * @description
 * When running tests on BrowserStack, local services need to be accessed through
 * BrowserStack's local tunnel hostname. For local development,
 * standard localhost is used.
 *
 * @returns The hostname to use for connecting to local services:
 * - 'bs-local.com' when running on BrowserStack (detected via BROWSERSTACK_LOCAL env var)
 * - 'localhost' for local development and other environments
 *
 * @example
 * ```typescript
 * const fixtureServerHost = getLocalHost();
 * const serverUrl = `http://${fixtureServerHost}:${port}`;
 * // Returns: "http://bs-local.com:12345" on BrowserStack
 * // Returns: "http://localhost:12345" locally
 * ```
 */
export function getLocalHost() {
  return isBrowserStack() ? 'bs-local.com' : 'localhost';
}

/**
 * Gets a port for use in fixture data construction.
 * Returns the fallback port which will be mapped to the actual allocated port.
 * Safe to call before ports are allocated (during fixture building).
 *
 * @param resourceType - The type of resource
 * @returns The fallback port to use in fixture data
 */
function getFixtureDataPort(resourceType: ResourceType): number {
  return getFallbackPort(resourceType);
}

/**
 * Gets the runtime port for a resource that has been allocated by PortManager.
 * This should be called during test execution, after startResourceWithRetry().
 * Throws an error if the port hasn't been allocated yet.
 *
 * @param resourceType - The type of resource
 * @returns The allocated port for the resource
 */
function getServerPort(resourceType: ResourceType): number {
  const allocatedPort = PortManager.getInstance().getPort(resourceType);

  if (allocatedPort === undefined) {
    throw new Error(
      `Port not allocated for ${resourceType}. Ensure startResourceWithRetry() is called before accessing the port.`,
    );
  }

  logger.debug(
    `Using PortManager allocated port ${allocatedPort} for ${resourceType}`,
  );
  return allocatedPort;
}

/**
 * Gets the URL for the second test dapp.
 * This function is used instead of a constant to ensure device.getPlatform() is called
 * after Detox is properly initialized, preventing initialization errors in the apiSpecs tests.
 *
 * @returns {string} The URL for the second test dapp
 */
// ========== New Clean Dapp API (Use These) ==========

/**
 * Gets the dapp URL for use during test execution.
 * Automatically handles platform differences (Android uses fallback ports, iOS uses actual allocated ports).
 *
 * NOTE: BrowserStack Local tunnel automatically handles localhost requests, so we don't need
 * to use bs-local.com for dapp URLs. They work fine with localhost on BrowserStack.
 *
 * @param index - The dapp index (0 for first dapp, 1 for second dapp, etc.)
 * @returns The dapp URL (e.g., "http://localhost:8085" on Android, "http://localhost:59517" on iOS)
 *
 * @example
 * // Get first dapp URL
 * const url = getDappUrl(0);
 *
 * // Get second dapp URL
 * const url2 = getDappUrl(1);
 */
export function getDappUrl(index: number): string {
  const isAndroid = FrameworkDetector.isDetox()
    ? device.getPlatform() === 'android'
    : true; // Appium single emulator assumption
  const port = isAndroid
    ? FALLBACK_DAPP_SERVER_PORT + index
    : getDappPort(index);
  return `http://localhost:${port}`;
}

/**
 * Gets the actual allocated dapp port (iOS runtime only).
 * On Android, use getDappUrl() instead as it handles adb reverse mapping.
 *
 * @param index - The dapp index (0 for first dapp, 1 for second dapp, etc.)
 * @returns The actual allocated port from PortManager
 * @throws Error if port not allocated (must call startMultiInstanceResourceWithRetry first)
 */
export function getDappPort(index: number): number {
  const instanceId = `dapp-server-${index}`;
  const allocatedPort = PortManager.getInstance().getMultiInstancePort(
    ResourceType.DAPP_SERVER,
    instanceId,
  );

  if (allocatedPort === undefined) {
    throw new Error(
      `Port not allocated for ${instanceId}. Ensure startMultiInstanceResourceWithRetry() is called before accessing the port.`,
    );
  }

  logger.debug(
    `Using PortManager allocated port ${allocatedPort} for ${instanceId}`,
  );
  return allocatedPort;
}

/**
 * Gets the dapp URL for use in fixture data construction.
 * Safe to call before ports are allocated (returns fallback port).
 *
 * NOTE: BrowserStack Local tunnel automatically handles localhost requests, so we don't need
 * to use bs-local.com for dapp URLs in fixtures.
 *
 * @param index - The dapp index (0 for first dapp, 1 for second dapp, etc.)
 * @returns The dapp URL with fallback port (e.g., "http://localhost:8085", "http://localhost:8086")
 *
 * @example
 * // In FixtureBuilder constructor
 * const url = getDappUrlForFixture(0); // "http://localhost:8085"
 */
export function getDappUrlForFixture(index: number): string {
  return `http://localhost:${getDappPortForFixture(index)}`;
}

/**
 * Gets the dapp port for use in fixture data construction.
 * Safe to call before ports are allocated (returns fallback port).
 *
 * @param index - The dapp index (0 for first dapp, 1 for second dapp, etc.)
 * @returns The fallback dapp port (8085, 8086, etc.)
 */
export function getDappPortForFixture(index: number): number {
  return getFallbackPort(ResourceType.DAPP_SERVER) + index;
}

/**
 * @deprecated Use getDappUrl(0) instead
 */
export function getTestDappLocalUrl() {
  return getDappUrl(0);
}

/**
 * Gets the Anvil port for use during test execution.
 * Automatically handles platform differences (Android uses fallback port, iOS uses actual allocated port).
 *
 * @returns The Anvil port to use in tests (8545 on Android, allocated port on iOS)
 *
 * @example
 * // Get Anvil WebSocket URL
 * const wsUrl = `ws://localhost:${getAnvilPortForTest()}`;
 */
export function getAnvilPortForTest(): number {
  const isAndroid = FrameworkDetector.isDetox()
    ? device.getPlatform() === 'android'
    : true;
  return isAndroid ? DEFAULT_ANVIL_PORT : getServerPort(ResourceType.ANVIL);
}

export function getGanachePort(): number {
  return getServerPort(ResourceType.GANACHE);
}
export function AnvilPort(): number {
  return getServerPort(ResourceType.ANVIL);
}
export function getFixturesServerPort(): number {
  return getServerPort(ResourceType.FIXTURE_SERVER);
}
export function getCommandQueueServerPort(): number {
  return getServerPort(ResourceType.COMMAND_QUEUE_SERVER);
}

export function getMockServerPort(): number {
  return getServerPort(ResourceType.MOCK_SERVER);
}

// ========== Fixture Data Port Getters (Safe to call before allocation) ==========
//
// IMPORTANT: Use these "*ForFixture" functions when building fixture data!
//
// Port Allocation Timing:
// - Fixture data is constructed FIRST (in FixtureBuilder constructor)
// - Ports are allocated LATER (during withFixtures() execution)
//
// Two Sets of Functions:
// 1. Runtime port getters (e.g., getGanachePort())
//    - Return actual PortManager-allocated ports
//    - Throw error if called before allocation
//    - Use these during test execution
//
// 2. Fixture data port getters (e.g., getGanachePortForFixture())
//    - Return fallback ports (8546, 8085, etc.)
//    - Safe to call anytime, including during fixture construction
//    - Use these when building fixture data in FixtureBuilder
//
// Port Mapping:
// - Fixture data always contains fallback ports (e.g., ganache: 8546)
// - Android: adb reverse maps fallback ports to actual allocated ports
// - iOS: LaunchArgs override fallback ports with actual allocated ports
//
// These functions return fallback ports for use in fixture data construction.
// They can be called during FixtureBuilder construction, before ports are allocated.

/**
 * Gets the Ganache port for use in fixture data.
 * Safe to call during fixture construction (before port allocation).
 * @returns The fallback Ganache port (8546)
 */
export function getGanachePortForFixture(): number {
  return getFixtureDataPort(ResourceType.GANACHE);
}

/**
 * Gets the Anvil port for use in fixture data.
 * Safe to call during fixture construction (before port allocation).
 * @returns The fallback Anvil port (same as Ganache: 8546)
 */
export function getAnvilPortForFixture(): number {
  return getFixtureDataPort(ResourceType.ANVIL);
}

/**
 * Gets the fixture server port for use in fixture data.
 * Safe to call during fixture construction (before port allocation).
 * @returns The fallback fixture server port (12345)
 */
export function getFixturesServerPortForFixture(): number {
  return getFixtureDataPort(ResourceType.FIXTURE_SERVER);
}

/**
 * Gets the mock server port for use in fixture data.
 * Safe to call during fixture construction (before port allocation).
 * @returns The fallback mock server port (8000)
 */
export function getMockServerPortForFixture(): number {
  return getFixtureDataPort(ResourceType.MOCK_SERVER);
}

interface Caip25Permission {
  [Caip25EndowmentPermissionName]: {
    caveats: {
      type: string;
      value: Caip25CaveatValue;
    }[];
  };
}

export function buildPermissions(chainIds: string[]): Caip25Permission {
  logger.debug('Building permissions for chainIds:', chainIds);
  // default mainnet
  const optionalScopes: InternalScopesObject = {
    'eip155:1': { accounts: [] },
  };

  for (const chainId of chainIds) {
    optionalScopes[`eip155:${parseInt(chainId, 10)}`] = {
      accounts: [],
    };
  }
  return {
    [Caip25EndowmentPermissionName]: {
      caveats: [
        {
          type: Caip25CaveatType,
          value: {
            optionalScopes,
            requiredScopes: {},
            sessionProperties: {},
            isMultichainOrigin: false,
          },
        },
      ],
    },
  };
}
