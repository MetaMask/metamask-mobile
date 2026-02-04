/* eslint-disable import/no-nodejs-modules */
import path from 'path';
import { GanacheHardfork } from './types.ts';
import { DEFAULT_ANVIL_PORT } from '../seeder/anvil-manager.ts';

// The RPC URL for the local node
// This should be used in fixtures where a url is needed.
// The port is then translated to the actual allocated port
export const LOCAL_NODE_RPC_URL = `http://localhost:${DEFAULT_ANVIL_PORT}`;

// Port Constants
// Fallback ports - used in fixture data (app's persisted state)
// Android: These ports are mapped to actual PortManager-allocated ports via adb reverse
// iOS: These ports are overridden by LaunchArgs at runtime with actual allocated ports
export const FALLBACK_FIXTURE_SERVER_PORT = 12345;
export const FALLBACK_COMMAND_QUEUE_SERVER_PORT = 2446;
export const FALLBACK_MOCKSERVER_PORT = 8000;
export const FALLBACK_GANACHE_PORT = 8546;
export const FALLBACK_DAPP_SERVER_PORT = 8085;

// SRP corresponding to the vault set in the default fixtures - it's an empty test account, not secret
export const defaultGanacheOptions = {
  hardfork: GanacheHardfork.london,
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
};

export const DEFAULT_TAB_ID = 1749234797566;

// App Package IDs for different platforms
export const APP_PACKAGE_IDS = {
  IOS: 'io.metamask.MetaMask',
  ANDROID: 'io.metamask',
} as const;

export const DEFAULT_TEST_DAPP_PATH = path.join(
  '..',
  '..',
  'node_modules',
  '@metamask',
  'test-dapp',
  'dist',
);

export const DEFAULT_MULTICHAIN_TEST_DAPP_PATH = path.join(
  '..',
  '..',
  'node_modules',
  '@metamask',
  'test-dapp-multichain',
  'build',
);

export const DEFAULT_SOLANA_TEST_DAPP_PATH = path.join(
  '..',
  '..',
  'node_modules',
  '@metamask',
  'test-dapp-solana',
  'dist',
);

export const DEFAULT_TRON_TEST_DAPP_PATH = path.join(
  '..',
  '..',
  'node_modules',
  '@metamask',
  'test-dapp-tron',
  'dist',
);

/**
 * The schemes for the E2E deep links.
 * @enum {string}
 * @example
 * {
 *  E2EDeeplinkSchemes.PERPS,
 * }
 */
export enum E2EDeeplinkSchemes {
  PERPS = 'e2e://perps/',
}

/**
 * The variants of the dapp to load for test.
 * @enum {string}
 * @example
 * {
 *  dappVariant: DappVariants.TEST_DAPP,
 * }
 * @example
 */
export enum DappVariants {
  TEST_DAPP = 'test-dapp',
  MULTICHAIN_TEST_DAPP = 'multichain-test-dapp',
  SOLANA_TEST_DAPP = 'solana-test-dapp',
  TRON_TEST_DAPP = 'tron-test-dapp',
}

export const TestDapps = {
  [DappVariants.TEST_DAPP]: {
    dappPath: path.resolve(__dirname, DEFAULT_TEST_DAPP_PATH),
  },
  [DappVariants.MULTICHAIN_TEST_DAPP]: {
    dappPath: path.resolve(__dirname, DEFAULT_MULTICHAIN_TEST_DAPP_PATH),
  },
  [DappVariants.SOLANA_TEST_DAPP]: {
    dappPath: path.resolve(__dirname, DEFAULT_SOLANA_TEST_DAPP_PATH),
  },
  [DappVariants.TRON_TEST_DAPP]: {
    dappPath: path.resolve(__dirname, DEFAULT_TRON_TEST_DAPP_PATH),
  },
};

export enum RampsRegionsEnum {
  SAINT_LUCIA = 'saint-lucia',
  FRANCE = 'france',
  UNITED_STATES = 'united-states',
  SPAIN = 'spain',
}

export const RampsRegions = {
  [RampsRegionsEnum.SAINT_LUCIA]: {
    currencies: ['/currencies/fiat/xcd'],
    emoji: '🇱🇨',
    id: '/regions/lc',
    name: 'Saint Lucia',
    support: { buy: true, sell: true, recurringBuy: true },
    unsupported: false,
    recommended: false,
    detected: false,
  },
  [RampsRegionsEnum.FRANCE]: {
    currencies: ['/currencies/fiat/eur'],
    emoji: '🇫🇷',
    id: '/regions/fr',
    name: 'France',
    support: { buy: true, sell: true, recurringBuy: true },
    unsupported: false,
    recommended: false,
    detected: false,
  },
  [RampsRegionsEnum.UNITED_STATES]: {
    currencies: ['/currencies/fiat/usd'],
    emoji: '🇺🇸',
    id: '/regions/us-ca',
    name: 'California',
    support: { buy: true, sell: true, recurringBuy: true },
    unsupported: false,
    recommended: false,
    detected: false,
  },
  [RampsRegionsEnum.SPAIN]: {
    currencies: ['/currencies/fiat/eur'],
    emoji: '🇪🇸',
    id: '/regions/es',
    name: 'Spain',
    support: { buy: true, sell: true, recurringBuy: true },
    unsupported: false,
    recommended: false,
    detected: false,
  },
};
