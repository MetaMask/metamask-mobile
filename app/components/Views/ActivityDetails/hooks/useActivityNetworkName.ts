import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../selectors/networkController';
import { getMaybeHexChainId } from '../../../../util/bridge';

/** Best-effort human network names for well-known non-EVM CAIP chains. */
const NON_EVM_NETWORK_NAMES: Record<string, string> = {
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'Solana',
  'bip122:000000000019d6689c085ae165831e93': 'Bitcoin',
};

/**
 * Resolves a human-readable network name from a CAIP chain id, for both EVM
 * (via NetworkController config) and well-known non-EVM chains. Falls back to
 * the raw chain id so the row is never blank.
 */
export function useActivityNetworkName(chainId: string): string {
  const hexChainId = getMaybeHexChainId(chainId);
  const evmConfig = useSelector((state: RootState) =>
    hexChainId ? selectNetworkConfigurationByChainId(state, hexChainId) : null,
  );

  return evmConfig?.name ?? NON_EVM_NETWORK_NAMES[chainId] ?? chainId;
}
