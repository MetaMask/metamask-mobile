/**
 * Sentinel `/networks` API mock for component view tests that need relay / gasless
 * eligibility (e.g. EIP-7702 sponsored fee row). Matches
 * `getAllSentinelNetworkFlags` → `https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/networks`.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';

import { clearSentinelNetworkCache } from '../../../app/util/transactions/sentinel-api';
import {
  clearAllNockMocks,
  disableNetConnect,
  teardownNock,
} from './nockHelpers';

const SENTINEL_ETHEREUM_MAINNET_ORIGIN =
  'https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io';

/** Minimal shape consumed by `getSentinelNetworkFlags` / relay URL resolution. */
const ETHEREUM_MAINNET_FLAGS = {
  name: 'Ethereum Mainnet',
  group: 'ethereum',
  chainID: 1,
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  network: 'ethereum-mainnet',
  explorer: 'https://etherscan.io',
  confirmations: true,
  smartTransactions: false,
  relayTransactions: true,
  hidden: false,
  sendBundle: false,
};

/**
 * Enables relay + 7702 gasless checks for chain id `0x1` (decimal key `"1"`).
 * Call `clearSentinelNetworkCache()` before setup so the in-memory sentinel cache refetches.
 */
export function setupSentinelNetworksRelayEnabledMock(): void {
  clearSentinelNetworkCache();
  disableNetConnect();
  nock(SENTINEL_ETHEREUM_MAINNET_ORIGIN)
    .get('/networks')
    .reply(200, {
      '1': ETHEREUM_MAINNET_FLAGS,
    })
    .persist();
}

export function clearSentinelNetworksMocks(): void {
  clearAllNockMocks();
  clearSentinelNetworkCache();
  teardownNock();
}
