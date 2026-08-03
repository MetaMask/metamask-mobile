import { ensureValidState, addFailoverUrlToNetworkConfiguration } from './util';

const megaEthChainId = '0x10e6';
const migrationVersion = 150;

/**
 * Migration 150: Add failoverUrls to MegaETH network configuration
 *
 * This migration adds failoverUrls to the MegaETH network configuration
 * to ensure that the app can connect to the MegaETH network even if the
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
    megaEthChainId,
    migrationVersion,
    'MegaETH',
    'QUICKNODE_MEGAETH_URL',
  );
}
