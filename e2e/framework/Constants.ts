/* eslint-disable import/no-nodejs-modules */
import path from 'path';
import { GanacheHardfork } from './types';

// SRP corresponding to the vault set in the default fixtures - it's an empty test account, not secret
export const defaultGanacheOptions = {
  hardfork: GanacheHardfork.london,
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
};

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
};

export enum RampsRegionsEnum {
  SAINT_LUCIA = 'saint-lucia',
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
};
