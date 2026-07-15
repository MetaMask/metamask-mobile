import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex, parseCaipChainId } from '@metamask/utils';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { PopularList } from '../../../../../util/networks/customNetworks';
import { strings } from '../../../../../../locales/i18n';

/**
 * Resolves a human-readable network name from selected CAIP chain IDs.
 *
 * Checks user-configured networks first, then falls back to PopularList,
 * and finally defaults to "All networks".
 */
export const useNetworkName = (
  selectedNetwork: CaipChainId[] | null,
): string => {
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  return useMemo(() => {
    if (!selectedNetwork || selectedNetwork.length === 0) {
      return strings('trending.all_networks');
    }

    const selectedNetworkChainId = selectedNetwork[0];

    const networkConfig = networkConfigurations[selectedNetworkChainId];
    if (networkConfig?.name) {
      return networkConfig.name;
    }

    try {
      const { namespace, reference } = parseCaipChainId(selectedNetworkChainId);
      if (namespace === 'eip155') {
        const hexChainId = `0x${Number(reference).toString(16)}` as Hex;
        const popularNetwork = PopularList.find(
          (network) => network.chainId === hexChainId,
        );
        if (popularNetwork?.nickname) {
          return popularNetwork.nickname;
        }
      }
    } catch {
      // If parsing fails, fall through to default
    }

    return strings('trending.all_networks');
  }, [selectedNetwork, networkConfigurations]);
};
