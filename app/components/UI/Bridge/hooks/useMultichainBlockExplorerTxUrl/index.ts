import {
  formatChainIdToHex,
  formatChainIdToCaip,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import etherscanLink from '@metamask/etherscan-link';
import { useSelector } from 'react-redux';
import {
  createProviderConfig,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../../selectors/networkController';
import { useMemo } from 'react';
import { NetworkConfiguration } from '@metamask/network-controller';
import useBlockExplorer from '../../../../hooks/useBlockExplorer';
import { getTransactionUrl } from '../../../../../core/Multichain/utils';
import {
  getBlockExplorerName,
  getNetworkImageSource,
} from '../../../../../util/networks';
import { Hex } from '@metamask/utils';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../../selectors/multichainNetworkController';
import { getEtherscanBaseUrl } from '../../../../../util/etherscan';

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

  // Format chainId based on whether it's EVM or not
  const isNonEvm = chainId ? isNonEvmChainId(chainId) : false;
  let formattedChainId: string | undefined;
  if (chainId) {
    formattedChainId = isNonEvm
      ? formatChainIdToCaip(chainId)
      : formatChainIdToHex(chainId);
  }

  // EVM specific hooks - always call these regardless of chainId
  const evmNetworkConfig =
    formattedChainId && !isNonEvm
      ? evmNetworkConfigurations[formattedChainId as Hex]
      : undefined;

  const evmProviderConfig = useMemo(
    () =>
      evmNetworkConfig
        ? getProviderConfigForNetwork(evmNetworkConfig)
        : undefined,
    [evmNetworkConfig],
  );

  const blockExplorer = useBlockExplorer();

  // Handle undefined cases
  if (!chainId || !txHash) {
    return undefined;
  }

  // Determine explorer URL based on chain type and txHash
  let explorerTxUrl: string | undefined;
  if (!txHash) {
    explorerTxUrl = undefined;
  } else if (isNonEvm) {
    // Solana
    explorerTxUrl = getTransactionUrl(txHash, formatChainIdToCaip(chainId));
  } else {
    // EVM
    const baseUrl =
      blockExplorer.getEvmBlockExplorerUrl(formatChainIdToHex(chainId)) ??
      getEtherscanBaseUrl(evmProviderConfig?.type ?? '');

    explorerTxUrl = etherscanLink.createCustomExplorerLink(txHash, baseUrl);
  }

  // Get network image source
  const networkImageSource = getNetworkImageSource({
    chainId: formattedChainId as string,
  });

  // Determine explorer name and chain name
  const explorerName =
    isNonEvm && explorerTxUrl
      ? getBlockExplorerName(explorerTxUrl)
      : blockExplorer.getBlockExplorerName(formatChainIdToCaip(chainId));

  const chainName =
    isNonEvm && formattedChainId
      ? nonEvmNetworkConfigurations[formattedChainId]?.name
      : evmNetworkConfig?.name;

  return {
    explorerTxUrl,
    explorerName,
    networkImageSource,
    chainName,
  };
};
