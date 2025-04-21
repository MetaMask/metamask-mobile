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
  chainId: number; // From the Bridge API
  txHash?: string;
}) => {
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );

  const formattedChainId = isSolanaChainId(chainId)
    ? formatChainIdToCaip(chainId)
    : formatChainIdToHex(chainId);

  // EVM specific hooks
  // If chainId is Solana, these should be undefined
  const evmNetworkConfig = isSolanaChainId(chainId)
    ? undefined
    : evmNetworkConfigurations[formattedChainId as Hex];
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

  let explorerTxUrl: string | undefined;
  if (!txHash) {
    explorerTxUrl = undefined;
  } else if (isSolanaChainId(formattedChainId)) {
    // Solana
    explorerTxUrl = getTransactionUrl(txHash, formatChainIdToCaip(chainId));
  } else {
    // EVM
    explorerTxUrl = evmExplorer.tx(txHash);
  }

  //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
  const networkImageSource = getNetworkImageSource({
    chainId: formattedChainId,
  });

  return {
    explorerTxUrl,
    explorerName: isSolanaChainId(formattedChainId) && explorerTxUrl
      ? getBlockExplorerName(explorerTxUrl)
      : evmExplorer.name,
    networkImageSource,
    chainName: isSolanaChainId(formattedChainId)
      ? nonEvmNetworkConfigurations[formattedChainId]?.name
      : evmNetworkConfig?.name,
  };
};
