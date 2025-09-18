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
  const selectedChainId = useSelector(selectChainId);
  const isSolanaSelected =
    selectedChainId?.includes(KnownCaipNamespace.Solana) ?? false;
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  // Get all enabled networks for the namespace
  const enabledNetworks = useMemo(() => {
    if (isMultichainAccountsState2Enabled) {
      const networksForNamespace = {
        ...Object.values(enabledNetworksByNamespace).reduce(
          (acc, obj) => ({ ...acc, ...obj }),
          {},
        ),
      };

      return Object.entries(networksForNamespace)
        .filter(([_key, value]) => value)
        .map(([chainId, enabled]) => ({ chainId, enabled: Boolean(enabled) }));
    }

    const networksForNamespace = enabledNetworksByNamespace[namespace] || {};
    return Object.entries(networksForNamespace)
      .filter(([_key, value]) => value)
      .map(([chainId, enabled]) => ({ chainId, enabled: Boolean(enabled) }));
  }, [
    enabledNetworksByNamespace,
    isMultichainAccountsState2Enabled,
    namespace,
  ]);

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

  let isDisabled: boolean =
    Boolean(!isEvmSelected) && !isMultichainAccountsState2Enabled;
  // We don't have Solana testnet networks, so we disable the network selector if Solana is selected
  // TODO: Come back when we have Solana devnet available
  isDisabled = Boolean(isSolanaSelected) && !isMultichainAccountsState2Enabled;

  const hasEnabledNetworks = enabledNetworks.length > 0;

  return {
    enabledNetworks,
    getNetworkInfo,
    getNetworkInfoByChainId,
    isDisabled,
    hasEnabledNetworks,
  };
};
