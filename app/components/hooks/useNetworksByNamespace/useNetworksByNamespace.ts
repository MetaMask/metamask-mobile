import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ImageSourcePropType } from 'react-native';
import { CaipChainId, parseCaipChainId } from '@metamask/utils';
import {
  selectPopularNetworkConfigurationsByCaipChainId,
  selectCustomNetworkConfigurationsByCaipChainId,
  EvmAndMultichainNetworkConfigurationsWithCaipChainId,
} from '../../../selectors/networkController';
import { getNetworkImageSource } from '../../../util/networks';
import { useNetworkEnablement } from '../useNetworkEnablement/useNetworkEnablement';

export interface ProcessedNetwork {
  id: string;
  name: string;
  caipChainId: CaipChainId;
  isSelected: boolean;
  imageSource: ImageSourcePropType;
  networkTypeOrRpcUrl?: string;
}

export enum NetworkType {
  Popular = 'popular',
  Custom = 'custom',
}

interface UseNetworksByNamespaceOptions {
  /** Filter by popular or custom networks */
  networkType: NetworkType;
}

/**
 * Filters and processes networks based on the current namespace (EVM, Bitcoin, etc).
 * Enriches network data with selection state and UI-ready properties.
 * @param options.networkType - Filter by popular or custom networks
 * @returns Processed networks with selection state and aggregated statistics
 * @example
 * const { networks, areAllNetworksSelected } = useNetworksByNamespace({
 *   networkType: NetworkType.Popular
 * });
 */
export const useNetworksByNamespace = ({
  networkType,
}: UseNetworksByNamespaceOptions) => {
  const { namespace, enabledNetworksForCurrentNamespace } =
    useNetworkEnablement();

  const popularNetworkConfigurations = useSelector(
    selectPopularNetworkConfigurationsByCaipChainId,
  );

  const customNetworkConfigurations = useSelector(
    selectCustomNetworkConfigurationsByCaipChainId,
  );

  const networkConfigurations = useMemo(
    () =>
      networkType === NetworkType.Popular
        ? popularNetworkConfigurations
        : customNetworkConfigurations,
    [networkType, popularNetworkConfigurations, customNetworkConfigurations],
  );

  const filteredNetworkConfigurations = useMemo(() => {
    if (networkType === NetworkType.Popular) {
      return Object.entries(networkConfigurations).filter(([, network]) => {
        const networkNamespace = parseCaipChainId(
          network.caipChainId,
        ).namespace;
        return networkNamespace === namespace;
      });
    }
    return networkConfigurations.filter((network) => {
      const networkNamespace = parseCaipChainId(network.caipChainId).namespace;
      return networkNamespace === namespace;
    });
  }, [networkConfigurations, namespace, networkType]);

  const processedNetworks: ProcessedNetwork[] = useMemo(() => {
    if (networkType === NetworkType.Popular) {
      return (
        filteredNetworkConfigurations as [
          string,
          EvmAndMultichainNetworkConfigurationsWithCaipChainId,
        ][]
      ).map(([, network]) => {
        const rpcUrl =
          'rpcEndpoints' in network
            ? network.rpcEndpoints?.[network.defaultRpcEndpointIndex]?.url
            : undefined;

        const isSelected = Boolean(
          enabledNetworksForCurrentNamespace[network.chainId],
        );

        return {
          id: network.caipChainId,
          name: network.name,
          caipChainId: network.caipChainId,
          isSelected,
          imageSource: getNetworkImageSource({
            chainId: network.caipChainId,
          }),
          networkTypeOrRpcUrl: rpcUrl,
        };
      });
    }
    return (
      filteredNetworkConfigurations as EvmAndMultichainNetworkConfigurationsWithCaipChainId[]
    ).map((network) => {
      const rpcUrl =
        'rpcEndpoints' in network
          ? network.rpcEndpoints?.[network.defaultRpcEndpointIndex]?.url
          : undefined;

      const isSelected = Boolean(
        enabledNetworksForCurrentNamespace[network.chainId],
      );

      return {
        id: network.caipChainId,
        name: network.name,
        caipChainId: network.caipChainId,
        isSelected,
        imageSource: getNetworkImageSource({ chainId: network.caipChainId }),
        networkTypeOrRpcUrl: rpcUrl,
      };
    });
  }, [
    filteredNetworkConfigurations,
    enabledNetworksForCurrentNamespace,
    networkType,
  ]);

  const selectedNetworks = useMemo(
    () => processedNetworks.filter((network) => network.isSelected),
    [processedNetworks],
  );

  const areAllNetworksSelected = useMemo(
    () =>
      processedNetworks.length > 0 &&
      processedNetworks.every((network) => network.isSelected),
    [processedNetworks],
  );

  const areAnyNetworksSelected = useMemo(
    () => selectedNetworks.length > 0,
    [selectedNetworks],
  );

  return {
    networks: processedNetworks,
    selectedNetworks,
    areAllNetworksSelected,
    areAnyNetworksSelected,
    networkCount: processedNetworks.length,
    selectedCount: selectedNetworks.length,
  };
};
