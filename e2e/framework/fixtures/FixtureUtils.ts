/* eslint-disable import/no-nodejs-modules */
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
} from '../Constants';
import net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../logger';

const logger = createLogger({
  name: 'FixtureUtils',
});

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

function transformToValidPort(defaultPort: number, pid: number) {
  // Improve uniqueness by using a simple transformation
  const transformedPort = (pid % 100000) + defaultPort;

  // Ensure the transformed port falls within the valid port range (0-65535)
  return transformedPort % 65536;
}

function getServerPort(defaultPort: number) {
  if (process.env.CI) {
    if (isBrowserStack()) {
      // if running on browserstack, do not use dynamic ports
      return defaultPort;
    }
    return transformToValidPort(defaultPort, process.pid);
  }
  return defaultPort;
}

/**
 * Kills a service based on its PID.
 * @param {number} pid - The process ID of the service to kill.
 * @returns {boolean} True if the process was killed successfully, false otherwise.
 */
export async function killServiceByPid(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 'SIGKILL');

    // Explicitly adding a timeout in case the process is not killed immediately
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
  } catch (error) {
    // Process may not exist or permission denied
    return false;
  }
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
  return `http://${host}:${getLocalTestDappPort() + dappCounter}`;
}

export function getTestDappLocalUrl() {
  return `http://localhost:${getLocalTestDappPort()}`;
}

export function getGanachePort(): number {
  return getServerPort(DEFAULT_GANACHE_PORT);
}
export function AnvilPort(): number {
  return getServerPort(DEFAULT_ANVIL_PORT);
}
export function getFixturesServerPort(): number {
  return getServerPort(DEFAULT_FIXTURE_SERVER_PORT);
}

export function getLocalTestDappPort(): number {
  return getServerPort(DEFAULT_DAPP_SERVER_PORT);
}

export function getMockServerPort(): number {
  return getServerPort(DEFAULT_MOCKSERVER_PORT);
}

export function getSecondTestDappPort(): number {
  // Use a different base port for the second dapp
  return getServerPort(DEFAULT_DAPP_SERVER_PORT + 1);
}

interface Caip25Permission {
  [Caip25EndowmentPermissionName]: {
    caveats: {
      type: string;
      value: Caip25CaveatValue;
    }[];
  };
}

/**
 * Checks if a specific port is in use
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} True if the port is in use, false otherwise
 */
export async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net
      .createServer()
      .once('error', () => {
        // Port is in use
        resolve(true);
      })
      .once('listening', () => {
        // Port is free
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

/**
 * Attempts to kill any process using the specified port
 * Cross-platform compatible implementation that works on Windows, macOS, and Linux
 * @param {number} port - The port to free up
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
  // First check if the port is actually in use
  const portInUse = await isPortInUse(port);
  if (!portInUse) {
    logger.debug(`Port ${port} is already free`);
    return true;
  }

  const execAsync = promisify(exec);
  let command = '';

  // Use platform-specific commands to find and kill the process
  if (process.platform === 'win32') {
    // Windows command to find and kill process on port
    command = `for /f "tokens=5" %a in ('netstat -ano ^| find "LISTENING" ^| find ":${port}"') do taskkill /F /PID %a`;
  } else {
    // macOS/Linux command
    // Using a safer approach that handles empty results better
    command = `lsof -i :${port} -t | xargs -r kill -9`;
  }

  try {
    logger.debug(`Attempting to free up port ${port} on ${process.platform}`);
    await execAsync(command);

    // Give it a moment to release the port
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify the port is now available
    const stillInUse = await isPortInUse(port);
    if (stillInUse) {
      logger.debug(`Port ${port} is still in use after kill attempt`);
      return false;
    }

    logger.debug(`Successfully freed port ${port}`);
    return true;
  } catch (error) {
    logger.debug(`Error freeing port ${port}: ${error}`);

    // Even if the command failed, check if the port is now available
    // (it might have been released by other means)
    return !(await isPortInUse(port));
  }
}

export function buildPermissions(chainIds: string[]): Caip25Permission {
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
