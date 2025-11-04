import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  type Caip25CaveatValue,
  type InternalScopesObject,
} from '@metamask/chain-agnostic-permission';

import { DEFAULT_GANACHE_PORT } from '../../../app/util/test/ganache';
import { DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager';
import {
  DEFAULT_FIXTURE_SERVER_PORT,
  DEFAULT_MOCKSERVER_PORT,
  DEFAULT_DAPP_SERVER_PORT,
  DEFAULT_COMMAND_QUEUE_SERVER_PORT,
} from '../Constants';
import { createLogger } from '../logger';
import PortManager, { ResourceId } from '../PortManager';
import { Resource } from '../types';

const logger = createLogger({
  name: 'FixtureUtils',
});

/**
 * Starts a resource with automatic port retry logic.
 *
 * This function handles the race condition where a port appears available
 * but becomes occupied before the resource can bind to it. It will retry
 * with a new port if the start fails with EADDRINUSE.
 */
export async function startResourceWithRetry(
  resourceId: ResourceId | string,
  resource: Resource,
  preferredPort?: number,
  maxRetries: number = 3,
): Promise<number> {
  let attempt = 0;
  let lastError: Error | undefined;
  let currentPreferredPort = preferredPort;

  while (attempt <= maxRetries) {
    try {
      const port = await PortManager.getInstance().getAvailablePort({
        resourceId,
        preferredPort: currentPreferredPort,
      });

      resource.setServerPort(port);
      await resource.start();

      logger.debug(
        `✓ Resource ${resourceId} started successfully on port ${port}`,
      );
      return port;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = (
        error instanceof Error ? error.message : String(error)
      ).toLowerCase();

      // Get the failed port before releasing
      const failedPort =
        PortManager.getInstance().getPortForResource(resourceId);

      // Release the failed port allocation
      if (failedPort !== undefined) {
        PortManager.getInstance().releasePort(failedPort);
      }

      // Check if it's a port conflict error that we should retry
      if (
        attempt < maxRetries &&
        (errorMessage.includes('eaddrinuse') ||
          errorMessage.includes('address already in use'))
      ) {
        attempt++;
        // Try next port on retry to avoid the same conflict
        currentPreferredPort =
          failedPort !== undefined ? failedPort + 1 : undefined;
        logger.debug(
          `Port ${failedPort} conflict for ${resourceId}, retrying with port ${currentPreferredPort || 'next available'} (${attempt}/${maxRetries})`,
        );
        continue;
      }

      // Non-retryable error or max retries reached
      logger.error(
        `Failed to start ${resourceId} after ${attempt} attempts:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  throw new Error(
    `Failed to start ${resourceId} after ${maxRetries} retries: ${lastError?.message}`,
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

function getServerPort(
  resourceId: ResourceId | string,
  defaultPort: number,
): number {
  if (isBrowserStack()) {
    return defaultPort;
  }
  const allocatedPort =
    PortManager.getInstance().getPortForResource(resourceId);

  if (allocatedPort !== undefined) {
    logger.debug(
      `Using PortManager allocated port ${allocatedPort} for ${resourceId}`,
    );
    return allocatedPort;
  }

  return defaultPort;
}

/**
 * Gets the URL for the second test dapp.
 * This function is used instead of a constant to ensure device.getPlatform() is called
 * after Detox is properly initialized, preventing initialization errors in the apiSpecs tests.
 *
 * @returns {string} The URL for the second test dapp
 */
export function getSecondTestDappLocalUrl() {
  const host = device.getPlatform() === 'android' ? '10.0.2.2' : '127.0.0.1';
  return `http://${host}:${getSecondTestDappPort()}`;
}

export function getTestDappLocalUrlByDappCounter(dappCounter: number) {
  const host = device.getPlatform() === 'android' ? '10.0.2.2' : '127.0.0.1';
  const port = getDappServerPortByIndex(dappCounter);
  return `http://${host}:${port}`;
}

export function getDappServerPortByIndex(index: number): number {
  const resourceId = `dapp-server-${index}`;
  return getServerPort(resourceId, DEFAULT_DAPP_SERVER_PORT + index);
}

export function getTestDappLocalUrl() {
  return `http://localhost:${getLocalTestDappPort()}`;
}

export function getGanachePort(): number {
  return getServerPort(ResourceId.GANACHE, DEFAULT_GANACHE_PORT);
}
export function AnvilPort(): number {
  return getServerPort(ResourceId.ANVIL, DEFAULT_ANVIL_PORT);
}
export function getFixturesServerPort(): number {
  return getServerPort(ResourceId.FIXTURE_SERVER, DEFAULT_FIXTURE_SERVER_PORT);
}
export function getCommandQueueServerPort(): number {
  return getServerPort(
    ResourceId.COMMAND_QUEUE_SERVER,
    DEFAULT_COMMAND_QUEUE_SERVER_PORT,
  );
}

export function getLocalTestDappPort(): number {
  return getServerPort(ResourceId.DAPP_SERVER, DEFAULT_DAPP_SERVER_PORT);
}

export function getMockServerPort(): number {
  return getServerPort(ResourceId.MOCK_SERVER, DEFAULT_MOCKSERVER_PORT);
}

export function getSecondTestDappPort(): number {
  return getServerPort(ResourceId.DAPP_SERVER_1, DEFAULT_DAPP_SERVER_PORT + 1);
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
