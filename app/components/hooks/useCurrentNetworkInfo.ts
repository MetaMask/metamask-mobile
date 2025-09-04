import { useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { selectNetworkConfigurationsByCaipChainId } from '../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../selectors/multichainNetworkController';
import { useNetworkEnablement } from './useNetworkEnablement/useNetworkEnablement';
import { selectMultichainAccountsState2Enabled } from '../../selectors/featureFlagController/multichainAccounts';

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
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

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

  const isDisabled = !isEvmSelected && !isMultichainAccountsState2Enabled;
  const hasEnabledNetworks = enabledNetworks.length > 0;

  return {
    enabledNetworks,
    getNetworkInfo,
    getNetworkInfoByChainId,
    isDisabled,
    hasEnabledNetworks,
  };
};
