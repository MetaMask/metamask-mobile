import {
  KnownCaipNamespace,
  type CaipChainId,
  type Hex,
  parseCaipChainId,
} from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import type { NetworkConfiguration } from '@metamask/network-controller';
import type { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import { strings } from '../../../../locales/i18n';

const unknownNetwork = () => strings('network_information.unknown_network');

export interface CurrentSelectedNetworkForDisplayName {
  caipChainId: CaipChainId;
  name: string;
}

export interface ResolveNetworkDisplayNameArgs {
  chainId: string | null;
  evmNetworkConfigurations: Record<Hex, NetworkConfiguration>;
  nonEvmNetworkConfigurations: Record<
    CaipChainId,
    MultichainNetworkConfiguration
  >;
  currentSelectedNetwork?: CurrentSelectedNetworkForDisplayName | null;
}

/**
 * Resolves a user-visible network name for EVM hex chain IDs, non-EVM CAIP chain
 * IDs, and CAIP `eip155` strings — matching the NetworkMultiSelector sheet logic.
 */
export function resolveNetworkDisplayName({
  chainId,
  evmNetworkConfigurations,
  nonEvmNetworkConfigurations,
  currentSelectedNetwork,
}: ResolveNetworkDisplayNameArgs): string {
  if (!chainId) {
    return unknownNetwork();
  }

  if (currentSelectedNetwork) {
    if (currentSelectedNetwork.caipChainId === chainId) {
      return currentSelectedNetwork.name;
    }

    try {
      const parsed = parseCaipChainId(currentSelectedNetwork.caipChainId);
      if (parsed.namespace === KnownCaipNamespace.Eip155) {
        const networkHexChainId = toHex(parsed.reference);
        if (networkHexChainId === chainId) {
          return currentSelectedNetwork.name;
        }
      }
    } catch {
      // Continue to fallback logic
    }
  }

  const isEvmChainId = chainId.startsWith('0x');
  if (isEvmChainId) {
    const networkConfig = evmNetworkConfigurations[chainId as Hex];
    return networkConfig?.name ?? unknownNetwork();
  }

  const nonEvmConfig = nonEvmNetworkConfigurations[chainId as CaipChainId];
  if (nonEvmConfig) {
    return nonEvmConfig.name ?? unknownNetwork();
  }

  try {
    const parsed = parseCaipChainId(chainId as CaipChainId);
    if (parsed.namespace === KnownCaipNamespace.Eip155) {
      const hexChainId = toHex(parsed.reference);
      const networkConfig = evmNetworkConfigurations[hexChainId];
      return networkConfig?.name ?? unknownNetwork();
    }
  } catch {
    // Not a valid CAIP chain ID
  }

  return unknownNetwork();
}
