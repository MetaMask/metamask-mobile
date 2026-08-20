import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import {
  selectPopularNetworkConfigurationsByCaipChainId,
  selectCustomNetworkConfigurationsByCaipChainId,
} from '../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../selectors/multichainNetworkController';
import { getNetworkImageSource } from '../../../../util/networks';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { ProcessedNetwork } from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';

/**
 * Network options for the Activity network filter.
 *
 * Pulls the same popular + custom networks (and order) that NetworkManager
 * shows — sourced from `networkController` selectors — and additionally includes
 * non-EVM mainnets so the filter can cover the whole activity feed. Critically,
 * this is decoupled from `NetworkEnablementController`: unlike
 * `useNetworksByNamespace`, it never reads the enabled-network set. `isSelected`
 * is always `false`; the bottom sheet derives the active selection from the
 * screen's own `networkFilter` instead.
 *
 * Order: popular EVM → non-EVM mainnets → custom.
 *
 * @returns Processed networks ready for the filter sheet.
 */
export const useNetworkFilterOptions = (): ProcessedNetwork[] => {
  const popularNetworks = useSelector(
    selectPopularNetworkConfigurationsByCaipChainId,
  );
  const customNetworks = useSelector(
    selectCustomNetworkConfigurationsByCaipChainId,
  );
  const nonEvmNetworks = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );

  return useMemo(() => {
    const seen = new Set<CaipChainId>();
    const options: ProcessedNetwork[] = [];

    const add = (caipChainId: CaipChainId, name: string) => {
      if (!caipChainId || seen.has(caipChainId)) {
        return;
      }
      seen.add(caipChainId);
      options.push({
        id: caipChainId,
        name,
        caipChainId,
        isSelected: false,
        imageSource: getNetworkImageSource({ chainId: caipChainId }),
      });
    };

    popularNetworks.forEach((network) =>
      add(network.caipChainId, network.name),
    );

    Object.entries(nonEvmNetworks).forEach(([caipChainId, network]) => {
      if (!network.isTestnet) {
        add(caipChainId as CaipChainId, network.name ?? caipChainId);
      }
    });

    customNetworks.forEach((network) => add(network.caipChainId, network.name));

    return options;
  }, [popularNetworks, customNetworks, nonEvmNetworks]);
};
