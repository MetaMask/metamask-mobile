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

function transformToValidPort(defaultPort: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentTestName = (global as any).getCurrentTestName?.();

  function hashStringToUInt32(input: string): number {
    // FNV-1a 32-bit for stable, fast hashing
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  const nameHash = currentTestName
    ? hashStringToUInt32(String(currentTestName))
    : 0;

  // Offset range chosen to minimize collisions while keeping within safe port limits
  const offset = nameHash % 30000; // 0..29999
  let candidate = defaultPort + offset;

  // Normalize into valid port range 0..65535
  candidate %= 65536;

  // Avoid privileged/invalid ports (<1024). Map into 1024..65535 deterministically
  if (candidate < 1024) {
    candidate = 1024 + (candidate % (65536 - 1024));
  }

  return candidate;
}

function getServerPort(defaultPort: number) {
  if (process.env.CI) {
    if (isBrowserStack()) {
      // if running on browserstack, do not use dynamic ports
      return defaultPort;
    }
    return transformToValidPort(defaultPort);
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
