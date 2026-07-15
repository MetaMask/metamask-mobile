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
import { NETWORK_TO_NAME_MAP } from '../../../core/Engine/constants';

const unknownNetwork = () => strings('network_information.unknown_network');

/**
 * Resolves the display name for an EVM hex chain ID, preferring the user's
 * persisted network configuration and falling back to the curated
 * `NETWORK_TO_NAME_MAP`. This keeps known popular networks (e.g. MegaETH,
 * HyperEVM) readable even when they aren't present in the user's
 * NetworkController state yet.
 */
const resolveEvmNetworkName = (
  hexChainId: Hex,
  evmNetworkConfigurations: Record<Hex, NetworkConfiguration>,
): string =>
  evmNetworkConfigurations[hexChainId]?.name ??
  (NETWORK_TO_NAME_MAP as Record<string, string>)[hexChainId] ??
  unknownNetwork();

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
    return resolveEvmNetworkName(chainId as Hex, evmNetworkConfigurations);
  }

  const nonEvmConfig = nonEvmNetworkConfigurations[chainId as CaipChainId];
  if (nonEvmConfig) {
    return nonEvmConfig.name ?? unknownNetwork();
  }

  try {
    const parsed = parseCaipChainId(chainId as CaipChainId);
    if (parsed.namespace === KnownCaipNamespace.Eip155) {
      const hexChainId = toHex(parsed.reference);
      return resolveEvmNetworkName(hexChainId, evmNetworkConfigurations);
    }
  } catch {
    // Not a valid CAIP chain ID
  }

  return unknownNetwork();
}
