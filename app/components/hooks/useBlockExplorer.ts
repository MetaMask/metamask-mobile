import { useCallback } from 'react';
import { RPC } from '../../constants/network';
import {
  findBlockExplorerForRpc,
  getBlockExplorerName as getBlockExplorerNameFromUrl,
} from '../../util/networks';
import { getEtherscanAddressUrl } from '../../util/etherscan';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../locales/i18n';
import {
  selectNetworkConfigurations,
  selectProviderConfig,
} from '../../selectors/networkController';
import Routes from '../../constants/navigation/Routes';
import {
  MAINNET_BLOCK_EXPLORER,
  LINEA_MAINNET_BLOCK_EXPLORER,
  LINEA_SEPOLIA_BLOCK_EXPLORER,
  SEPOLIA_BLOCK_EXPLORER,
  BASE_MAINNET_BLOCK_EXPLORER,
} from '../../constants/urls';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { formatBlockExplorerAddressUrl } from '../../core/Multichain/networks';
import { MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP } from '../../core/Multichain/constants';
import { isNonEvmChainId } from '../../core/Multichain/utils';
import { parseCaipChainId, isCaipChainId } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { PopularList } from '../../util/networks/customNetworks';

const useBlockExplorer = (chainId?: string) => {
  const navigation = useNavigation();
  const providerConfig = useSelector(selectProviderConfig);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  // Helper function to convert CAIP chain ID to hex chain ID for EVM networks
  const convertToHexChainId = useCallback((inputChainId: string): string => {
    if (isCaipChainId(inputChainId)) {
      const { namespace, reference } = parseCaipChainId(inputChainId);
      if (namespace === 'eip155') {
        return toHex(reference);
      }
      // For non-EVM chains, return as-is
      return inputChainId;
    }
    // Already in hex format or other format
    return inputChainId;
  }, []);

  // Helper function to get base block explorer URL for EVM chains
  const getEvmBlockExplorerUrl = useCallback((targetChainId: string) => {
    // First check the hardcoded constants for built-in networks
    const builtInBlockExplorers = {
      [CHAIN_IDS.MAINNET]: MAINNET_BLOCK_EXPLORER,
      [CHAIN_IDS.LINEA_MAINNET]: LINEA_MAINNET_BLOCK_EXPLORER,
      [CHAIN_IDS.LINEA_SEPOLIA]: LINEA_SEPOLIA_BLOCK_EXPLORER,
      [CHAIN_IDS.SEPOLIA]: SEPOLIA_BLOCK_EXPLORER,
      [CHAIN_IDS.BASE]: BASE_MAINNET_BLOCK_EXPLORER,
    };

    if (
      builtInBlockExplorers[targetChainId as keyof typeof builtInBlockExplorers]
    ) {
      return builtInBlockExplorers[
        targetChainId as keyof typeof builtInBlockExplorers
      ];
    }

    // Then check the comprehensive PopularList for additional networks
    const popularNetwork = PopularList.find(
      (network) => network.chainId === targetChainId,
    );
    if (popularNetwork?.rpcPrefs?.blockExplorerUrl) {
      return popularNetwork.rpcPrefs.blockExplorerUrl;
    }

    return null;
  }, []);

  const getBlockExplorerUrl = useCallback(
    (address: string, targetChainId?: string) => {
      const currentChainId = targetChainId || chainId;

      // Handle non-EVM chains
      if (currentChainId && isNonEvmChainId(currentChainId)) {
        const blockExplorerUrls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[
            currentChainId as keyof typeof MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP
          ];
        return blockExplorerUrls
          ? formatBlockExplorerAddressUrl(blockExplorerUrls, address)
          : null;
      }

      // For specific EVM chain block explorers
      if (currentChainId) {
        const hexChainId = convertToHexChainId(currentChainId);
        const baseUrl = getEvmBlockExplorerUrl(hexChainId);
        if (baseUrl) {
          return `${baseUrl}/address/${address}`;
        }
      }

      // For RPC networks, try to find custom block explorer
      const { type, rpcUrl } = providerConfig;
      if (type === RPC && rpcUrl) {
        const blockExplorer = findBlockExplorerForRpc(
          rpcUrl,
          networkConfigurations,
        );
        return blockExplorer ? `${blockExplorer}/address/${address}` : null;
      }

      // Fallback to etherscan-based URL
      return getEtherscanAddressUrl(type, address);
    },
    [
      chainId,
      providerConfig,
      networkConfigurations,
      getEvmBlockExplorerUrl,
      convertToHexChainId,
    ],
  );

  const toBlockExplorer = useCallback(
    (address: string, targetChainId?: string) => {
      const accountLink = getBlockExplorerUrl(address, targetChainId);

      if (!accountLink) {
        return;
      }

      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: {
          url: accountLink,
        },
      });
    },
    [navigation, getBlockExplorerUrl],
  );

  const getBlockExplorerName = useCallback(
    (targetChainId?: string) => {
      const currentChainId = targetChainId || chainId;

      // Handle non-EVM chains
      if (currentChainId && isNonEvmChainId(currentChainId)) {
        const blockExplorerUrls =
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[
            currentChainId as keyof typeof MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP
          ];
        return blockExplorerUrls
          ? getBlockExplorerNameFromUrl(blockExplorerUrls.url)
          : strings('swaps.block_explorer');
      }

      // For specific EVM chain block explorers
      if (currentChainId) {
        const hexChainId = convertToHexChainId(currentChainId);
        const baseUrl = getEvmBlockExplorerUrl(hexChainId);
        if (baseUrl) {
          return getBlockExplorerNameFromUrl(baseUrl);
        }
      }

      // For RPC networks, try to find custom block explorer
      const { type, rpcUrl } = providerConfig;
      if (type === RPC && rpcUrl) {
        const blockExplorer = findBlockExplorerForRpc(
          rpcUrl,
          networkConfigurations,
        );
        return blockExplorer
          ? getBlockExplorerNameFromUrl(blockExplorer)
          : strings('swaps.block_explorer');
      }

      // Fallback to etherscan-based URL
      return getBlockExplorerNameFromUrl(getEtherscanAddressUrl(type, ''));
    },
    [
      chainId,
      providerConfig,
      networkConfigurations,
      getEvmBlockExplorerUrl,
      convertToHexChainId,
    ],
  );

  return {
    toBlockExplorer,
    getBlockExplorerUrl,
    getBlockExplorerName,
    getEvmBlockExplorerUrl,
  };
};

export default useBlockExplorer;
