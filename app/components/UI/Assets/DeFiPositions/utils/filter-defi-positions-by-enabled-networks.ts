import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import { getMaybeHexChainId } from '../../../../../util/bridge';

/**
 * Filters V2 DeFi protocol position groups down to an explicit set of EVM
 * chain ids (e.g. "all popular networks" or a single locally-selected
 * network). Non-EVM positions (e.g. Solana) are kept when present in results.
 */
export function filterDeFiPositionsByEnabledNetworks(
  positions: DeFiProtocolPositionGroup[],
  chainIds: Hex[],
): DeFiProtocolPositionGroup[] {
  const enabledHexChainIds = new Set(chainIds);

  return positions.filter((position) => {
    const hexChainId = getMaybeHexChainId(position.chainId);
    if (hexChainId) {
      return enabledHexChainIds.has(hexChainId);
    }
    return true;
  });
}
