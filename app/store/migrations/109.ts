import { ensureValidState, addFailoverUrlToNetworkConfiguration } from './util';

const monadChainId = '0x8f';
const migrationVersion = 109;
/**
 * Migration 109: Add failoverUrls to Monad network configuration
 *
 * This migration adds failoverUrls to the Monad network configuration
 * to ensure that the app can connect to the Monad network even if the
 * primary RPC endpoint is down.
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  return addFailoverUrlToNetworkConfiguration(
    state,
    monadChainId,
    migrationVersion,
    'Monad',
    'QUICKNODE_MONAD_URL',
  );
}
