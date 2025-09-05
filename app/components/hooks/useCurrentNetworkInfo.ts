import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  selectNetworkConfigurationsByCaipChainId,
  selectChainId,
} from '../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../selectors/multichainNetworkController';
import { useNetworkEnablement } from './useNetworkEnablement/useNetworkEnablement';

export interface NetworkInfo {
  caipChainId: string;
  networkName: string;
}

export interface CurrentNetworkInfo {
  enabledNetworks: { chainId: string; enabled: boolean }[];
  getNetworkInfo: (index?: number) => NetworkInfo | null;
  getNetworkInfoByChainId: (chainId: string) => NetworkInfo | null;
  isDisabled: boolean;
  hasEnabledNetworks: boolean;
}

/**
 * Hook that provides current network information for the active namespace
 */
export const useCurrentNetworkInfo = (): CurrentNetworkInfo => {
  const { namespace, enabledNetworksByNamespace } = useNetworkEnablement();
  const networksByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const selectedChainId = useSelector(selectChainId);
  const isSolanaSelected =
    selectedChainId?.includes(KnownCaipNamespace.Solana) ?? false;

  // Get all enabled networks for the namespace
  const enabledNetworks = useMemo(() => {
    const networksForNamespace = enabledNetworksByNamespace[namespace] || {};
    return Object.entries(networksForNamespace)
      .filter(([_key, value]) => value)
      .map(([chainId, enabled]) => ({ chainId, enabled: Boolean(enabled) }));
  }, [enabledNetworksByNamespace, namespace]);

  // Generic function to get network info by index
  const getNetworkInfo = useCallback(
    (index: number = 0): NetworkInfo | null => {
      if (enabledNetworks.length <= index) return null;

      const chainId = enabledNetworks[index].chainId;
      const caipChainId = formatChainIdToCaip(chainId);
      const networkName = networksByCaipChainId[caipChainId]?.name || '';

      return { caipChainId, networkName };
    },
    [enabledNetworks, networksByCaipChainId],
  );

  // Generic function to get network info by specific chainId
  const getNetworkInfoByChainId = useCallback(
    (chainId: string): NetworkInfo | null => {
      const found = enabledNetworks.find(
        (network) => network.chainId === chainId,
      );
      if (!found) return null;

      const caipChainId = formatChainIdToCaip(found.chainId);
      const networkName = networksByCaipChainId[caipChainId]?.name || '';

      return { caipChainId, networkName };
    },
    [enabledNetworks, networksByCaipChainId],
  );

  let isDisabled: boolean = Boolean(!isEvmSelected);
  // We don't have Solana testnet networks, so we disable the network selector if Solana is selected
  isDisabled = Boolean(isSolanaSelected);

  const hasEnabledNetworks = enabledNetworks.length > 0;

  return {
    enabledNetworks,
    getNetworkInfo,
    getNetworkInfoByChainId,
    isDisabled,
    hasEnabledNetworks,
  };
};
