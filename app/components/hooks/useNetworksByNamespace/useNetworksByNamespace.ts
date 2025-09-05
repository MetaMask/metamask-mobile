import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ImageSourcePropType } from 'react-native';
import {
  CaipChainId,
  parseCaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import {
  selectPopularNetworkConfigurationsByCaipChainId,
  selectCustomNetworkConfigurationsByCaipChainId,
  EvmAndMultichainNetworkConfigurationsWithCaipChainId,
} from '../../../selectors/networkController';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
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

interface UseNetworksByCustomNamespaceOptions {
  /** Filter by popular or custom networks */
  networkType: NetworkType;
  /** The specific namespace to filter networks by */
  namespace: KnownCaipNamespace;
}

interface UseProcessedNetworksByNamespaceOptions {
  /** Filter by popular or custom networks */
  networkType: NetworkType;
  /** The namespace to filter networks by */
  namespace: KnownCaipNamespace;
  /** Enabled networks for the specified namespace */
  enabledNetworksForNamespace: Record<string, boolean>;
}

/**
 * Internal hook that contains the shared logic for processing networks by namespace.
 * This hook extracts the common functionality between useNetworksByNamespace and useNetworksByCustomNamespace.
 * @param options.networkType - Filter by popular or custom networks
 * @param options.namespace - The namespace to filter networks by
 * @param options.enabledNetworksForNamespace - Enabled networks for the specified namespace
 * @returns Processed networks with selection state and aggregated statistics
 */
const useProcessedNetworksByNamespace = ({
  networkType,
  namespace,
  enabledNetworksForNamespace,
}: UseProcessedNetworksByNamespaceOptions) => {
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
          enabledNetworksForNamespace[network.chainId],
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

      const isSelected = Boolean(enabledNetworksForNamespace[network.chainId]);

      return {
        id: network.caipChainId,
        name: network.name,
        caipChainId: network.caipChainId,
        isSelected,
        imageSource: getNetworkImageSource({ chainId: network.caipChainId }),
        networkTypeOrRpcUrl: rpcUrl,
      };
    });
  }, [filteredNetworkConfigurations, enabledNetworksForNamespace, networkType]);

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

  return useProcessedNetworksByNamespace({
    networkType,
    namespace: namespace as KnownCaipNamespace,
    enabledNetworksForNamespace: enabledNetworksForCurrentNamespace,
  });
};

/**
 * Filters and processes networks based on a specified namespace (EVM, Bitcoin, etc).
 * Enriches network data with selection state and UI-ready properties.
 * @param options.networkType - Filter by popular or custom networks
 * @param options.namespace - The specific namespace to filter networks by
 * @returns Processed networks with selection state and aggregated statistics
 * @example
 * const { networks, areAllNetworksSelected } = useNetworksByCustomNamespace({
 *   networkType: NetworkType.Popular,
 *   namespace: KnownCaipNamespace.Eip155
 * });
 */
export const useNetworksByCustomNamespace = ({
  networkType,
  namespace,
}: UseNetworksByCustomNamespaceOptions) => {
  const enabledNetworksByNamespace = useSelector(
    selectEnabledNetworksByNamespace,
  );

  const enabledNetworksForNamespace = useMemo(
    () => enabledNetworksByNamespace?.[namespace] || {},
    [enabledNetworksByNamespace, namespace],
  );

  return useProcessedNetworksByNamespace({
    networkType,
    namespace,
    enabledNetworksForNamespace,
  });
};
