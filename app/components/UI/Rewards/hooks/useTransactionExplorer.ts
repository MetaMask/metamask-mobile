import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { NetworkConfiguration } from '@metamask/network-controller';
import {
  CaipAssetType,
  CaipChainId,
  KnownCaipNamespace,
  Hex,
  parseCaipAssetType,
  parseCaipChainId,
} from '@metamask/utils';
import { getBlockExplorerName } from '../../../../util/networks';
import { getTransactionUrl } from '../../../../core/Multichain/utils';
import {
  selectEvmNetworkConfigurationsByChainId,
  createProviderConfig,
} from '../../../../selectors/networkController';
import { useLegacySwapsBlockExplorer } from '../../Bridge/hooks/useLegacySwapsBlockExplorer';
import { formatChainIdToHex } from '@metamask/bridge-controller';

type ExplorerInfo = { name: string; url: string } | undefined;

const getProviderConfigForNetwork = (networkConfig: NetworkConfiguration) => {
  const rpcEndpoint =
    networkConfig?.rpcEndpoints?.[networkConfig?.defaultRpcEndpointIndex];
  const providerConfig = createProviderConfig(networkConfig, rpcEndpoint);
  return providerConfig;
};

/**
 * Explorer resolver from a CAIP asset id and tx hash.
 * - For non‑EVM chains: builds URL via getTransactionUrl and derives name from URL
 * - For EVM chains: uses useBlockExplorer hook with .tx() method
 */
export const useTransactionExplorer = (
  assetId?: CaipAssetType,
  txHash?: string,
): ExplorerInfo => {
  const evmNetworkConfigurationsByChainId = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  ) as Record<Hex, NetworkConfiguration>;

  // Get the current chain ID for EVM explorer
  const currentChainId = useMemo(() => {
    if (!assetId) return undefined;
    const {
      chain: { namespace, reference },
    } = parseCaipAssetType(assetId);
    if (namespace !== KnownCaipNamespace.Eip155) return undefined;
    return formatChainIdToHex(reference);
  }, [assetId]);

  // Get provider config for current chain
  const providerConfig = useMemo(() => {
    if (!currentChainId) return undefined;
    const networkConfig = evmNetworkConfigurationsByChainId[currentChainId];
    if (!networkConfig) return undefined;
    return getProviderConfigForNetwork(networkConfig);
  }, [currentChainId, evmNetworkConfigurationsByChainId]);

  // Get EVM explorer
  const evmExplorer = useLegacySwapsBlockExplorer(
    evmNetworkConfigurationsByChainId,
    providerConfig,
  );

  return useMemo(() => {
    if (!assetId || !txHash) return undefined;

    const { chainId: caipChainId } = parseCaipAssetType(assetId);
    const { namespace } = parseCaipChainId(caipChainId as CaipChainId);

    // Non‑EVM path (Solana, etc.)
    if (namespace !== KnownCaipNamespace.Eip155) {
      const url = getTransactionUrl(txHash, caipChainId as CaipChainId);
      if (!url) return undefined;
      return { name: getBlockExplorerName(url) ?? '', url };
    }

    // EVM path - use the .tx() method
    const url = evmExplorer.tx(txHash);
    if (!url) return undefined;

    return { name: evmExplorer.name, url };
  }, [assetId, txHash, evmExplorer]);
};

export default useTransactionExplorer;
