import { ensureValidState, addFailoverUrlToNetworkConfiguration } from './util';

const seiChainId = '0x531';
const migrationVersion = 107;
/**
 * Migration 107: Add failoverUrls to SEI network configuration
 *
 * This migration adds failoverUrls to the SEI network configuration
 * to ensure that the app can connect to the SEI network even if the
 * primary RPC endpoint is down.
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  return addFailoverUrlToNetworkConfiguration(
    state,
    seiChainId,
    migrationVersion,
    'SEI',
    'QUICKNODE_SEI_URL',
  );
}
