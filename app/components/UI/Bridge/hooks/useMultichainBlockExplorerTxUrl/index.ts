import {
  formatChainIdToHex,
  formatChainIdToCaip,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import {
  createProviderConfig,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../../selectors/networkController';
import { useMemo } from 'react';
import { NetworkConfiguration } from '@metamask/network-controller';
import useBlockExplorer from '../../../Swaps/utils/useBlockExplorer';
import { getTransactionUrl } from '../../../../../core/Multichain/utils';
import { getBlockExplorerName, getNetworkImageSource } from '../../../../../util/networks';
import { Hex } from '@metamask/utils';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../selectors/multichainNetworkController';

const useEvmBlockExplorer = useBlockExplorer;

const getProviderConfigForNetwork = (networkConfig: NetworkConfiguration) => {
  const rpcEndpoint =
    networkConfig?.rpcEndpoints?.[networkConfig?.defaultRpcEndpointIndex];
  const providerConfig = createProviderConfig(networkConfig, rpcEndpoint);

  return providerConfig;
};

export const useMultichainBlockExplorerTxUrl = ({
  chainId,
  txHash,
}: {
  chainId?: number; // From the Bridge API
  txHash?: string;
}) => {
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );

  // Format chainId based on whether it's Solana or not
  const isSolana = chainId ? isSolanaChainId(chainId) : false;
  let formattedChainId: string | undefined;
  if (chainId) {
    formattedChainId = isSolana
      ? formatChainIdToCaip(chainId)
      : formatChainIdToHex(chainId);
  }

  // EVM specific hooks - always call these regardless of chainId
  const evmNetworkConfig = formattedChainId && !isSolana
    ? evmNetworkConfigurations[formattedChainId as Hex]
    : undefined;

  const evmProviderConfig = useMemo(
    () =>
      evmNetworkConfig
        ? getProviderConfigForNetwork(evmNetworkConfig)
        : undefined,
    [evmNetworkConfig],
  );

  const evmExplorer = useEvmBlockExplorer(
    evmNetworkConfigurations,
    evmProviderConfig,
  );

  // Handle undefined cases
  if (!chainId || !txHash) {
    return undefined;
  }

  // Determine explorer URL based on chain type and txHash
  let explorerTxUrl: string | undefined;
  if (!txHash) {
    explorerTxUrl = undefined;
  } else if (isSolana) {
    // Solana
    explorerTxUrl = getTransactionUrl(txHash, formatChainIdToCaip(chainId));
  } else {
    // EVM
    explorerTxUrl = evmExplorer.tx(txHash);
  }

  // Get network image source
  const networkImageSource = getNetworkImageSource({
    chainId: formattedChainId as string,
  });

  // Determine explorer name and chain name
  const explorerName = isSolana && explorerTxUrl
    ? getBlockExplorerName(explorerTxUrl)
    : evmExplorer.name;

  const chainName = isSolana && formattedChainId
    ? nonEvmNetworkConfigurations[formattedChainId]?.name
    : evmNetworkConfig?.name;

  return {
    explorerTxUrl,
    explorerName,
    networkImageSource,
    chainName,
  };
};
