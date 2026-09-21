import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import type { NetworkEnablementControllerState } from '@metamask/network-enablement-controller';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { getMaybeHexChainId } from '../../../../../util/bridge';

/**
 * Filters V2 DeFi protocol position groups to enabled EVM networks.
 * Non-EVM positions (e.g. Solana) are kept when present in results.
 */
export function filterDeFiPositionsByEnabledNetworks(
  positions: DeFiProtocolPositionGroup[],
  enabledNetworksByNamespace:
    | NetworkEnablementControllerState['enabledNetworkMap']
    | undefined,
): DeFiProtocolPositionGroup[] {
  const enabledEvmNetworks =
    enabledNetworksByNamespace?.[KnownCaipNamespace.Eip155] ?? {};
  const enabledHexChainIds = new Set(
    Object.keys(enabledEvmNetworks).filter(
      (chainId) => enabledEvmNetworks[chainId as Hex],
    ),
  );

  return positions.filter((position) => {
    const hexChainId = getMaybeHexChainId(position.chainId);
    if (hexChainId) {
      return enabledHexChainIds.has(hexChainId);
    }
    return true;
  });
}
