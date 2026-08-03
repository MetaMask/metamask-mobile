import { ensureValidState, addFailoverUrlToNetworkConfiguration } from './util';

const zkSyncEraChainId = '0x144';
const migrationVersion = 149;

/**
 * Migration 149: Add failoverUrls to zkSync Era network configuration
 *
 * This migration adds failoverUrls to the zkSync Era network configuration
 * to ensure that the app can connect to the zkSync Era network even if the
 * primary RPC endpoint is down.
 *
 * @param state - The state to migrate.
 * @returns The migrated state.
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  return addFailoverUrlToNetworkConfiguration(
    state,
    zkSyncEraChainId,
    migrationVersion,
    'zkSync Era',
    'QUICKNODE_ZKSYNC_URL',
  );
}
