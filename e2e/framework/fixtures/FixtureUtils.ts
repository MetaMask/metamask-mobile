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

function transformToValidPort(defaultPort: number, pid: number) {
  // Improve uniqueness by using a simple transformation
  const transformedPort = (pid % 100000) + defaultPort;

  // Ensure the transformed port falls within the valid port range (0-65535)
  return transformedPort % 65536;
}

function getServerPort(defaultPort: number) {
  if (process.env.CI) {
    return transformToValidPort(defaultPort, process.pid);
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
 * @param {number} port - The port to free up
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
  const execAsync = promisify(exec);

  try {
    // macOS/Linux command to find and kill process on port
    const cmd = `lsof -i :${port} -t | xargs kill -9`;
    await execAsync(cmd);

    // Give it a moment to release the port
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if port is now available
    return !(await isPortInUse(port));
  } catch (error) {
    // Error could be normal if no process was found
    logger.debug(`Attempted to kill process on port ${port}: ${error}`);
    return false;
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
