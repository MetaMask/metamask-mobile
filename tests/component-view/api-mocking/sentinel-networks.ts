/**
 * Sentinel `/networks` and `/network` API mocks for component view tests that need
 * relay / gasless eligibility (e.g. EIP-7702 sponsored fee row). Backed by a real
 * `SentinelApiService` so `getSentinelNetworkFlags` resolves via
 * `https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/network`.
 */

// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';

import { Messenger } from '@metamask/messenger';
import {
  SentinelApiService,
  type SentinelApiServiceMessenger,
} from '@metamask/sentinel-api-service';
import { setSentinelApiMessenger } from '../../../app/util/transactions/sentinel-api';
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
  cubistSigners: ['0xB01caEa8c6C47bbf4F4b4c5080Ca642043359C2E'],
  smartTransactions: false,
  relayTransactions: true,
  hidden: false,
  sendBundle: false,
};

let sentinelApiService: SentinelApiService | undefined;

/**
 * Enables relay + 7702 gasless checks for chain id `0x1` (decimal key `"1"`).
 * Creates a fresh `SentinelApiService` so no cached responses leak between tests.
 */
export function setupSentinelNetworksRelayEnabledMock(): void {
  setupSentinelApiService();
  disableNetConnect();

  nock(SENTINEL_ETHEREUM_MAINNET_ORIGIN)
    .get('/networks')
    .reply(200, {
      '1': ETHEREUM_MAINNET_FLAGS,
    })
    .persist();

  nock(SENTINEL_ETHEREUM_MAINNET_ORIGIN)
    .get('/network')
    .reply(200, ETHEREUM_MAINNET_FLAGS)
    .persist();
}

export function clearSentinelNetworksMocks(): void {
  clearAllNockMocks();
  teardownSentinelApiService();
  teardownNock();
}

function setupSentinelApiService(): void {
  teardownSentinelApiService();

  const messenger: SentinelApiServiceMessenger = new Messenger({
    namespace: 'SentinelApiService',
  });

  sentinelApiService = new SentinelApiService({
    clientId: 'mobile',
    fetch: fetch.bind(globalThis),
    messenger,
  });

  setSentinelApiMessenger(messenger);
}

function teardownSentinelApiService(): void {
  sentinelApiService?.destroy();
  sentinelApiService = undefined;
  setSentinelApiMessenger(undefined);
}
