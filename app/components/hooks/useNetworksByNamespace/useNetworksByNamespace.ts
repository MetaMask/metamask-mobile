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

/**
 * Internal base interface for shared hook logic
 */
interface UseNetworksBaseOptions {
  networkType: NetworkType;
  namespace: KnownCaipNamespace;
  enabledNetworksForNamespace: Record<string, boolean>;
}

/**
 * Helper function to get network configurations based on network type
 */
const useNetworkConfigurations = (networkType: NetworkType) => {
  const popularNetworkConfigurations = useSelector(
    selectPopularNetworkConfigurationsByCaipChainId,
  );

  const customNetworkConfigurations = useSelector(
    selectCustomNetworkConfigurationsByCaipChainId,
  );

  return useMemo(
    () =>
      networkType === NetworkType.Popular
        ? popularNetworkConfigurations
        : customNetworkConfigurations,
    [networkType, popularNetworkConfigurations, customNetworkConfigurations],
  );
};

/**
 * Helper function to filter network configurations by namespace
 */
const useFilteredNetworkConfigurations = (
  networkConfigurations:
    | Record<string, EvmAndMultichainNetworkConfigurationsWithCaipChainId>
    | EvmAndMultichainNetworkConfigurationsWithCaipChainId[],
  namespace: KnownCaipNamespace,
  networkType: NetworkType,
) =>
  useMemo(() => {
    if (networkType === NetworkType.Popular) {
      return Object.entries(
        networkConfigurations as Record<
          string,
          EvmAndMultichainNetworkConfigurationsWithCaipChainId
        >,
      ).filter(([, network]) => {
        const networkNamespace = parseCaipChainId(
          network.caipChainId,
        ).namespace;
        return networkNamespace === namespace;
      });
    }
    return (
      networkConfigurations as EvmAndMultichainNetworkConfigurationsWithCaipChainId[]
    ).filter((network) => {
      const networkNamespace = parseCaipChainId(network.caipChainId).namespace;
      return networkNamespace === namespace;
    });
  }, [networkConfigurations, namespace, networkType]);

/**
 * Helper function to process network configurations into ProcessedNetwork objects
 */
const useProcessedNetworks = (
  filteredNetworkConfigurations:
    | [string, EvmAndMultichainNetworkConfigurationsWithCaipChainId][]
    | EvmAndMultichainNetworkConfigurationsWithCaipChainId[],
  enabledNetworksForNamespace: Record<string, boolean>,
  networkType: NetworkType,
): ProcessedNetwork[] =>
  useMemo(() => {
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

/**
 * Helper function to calculate derived network statistics
 */
const useNetworkStatistics = (processedNetworks: ProcessedNetwork[]) => {
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
    selectedNetworks,
    areAllNetworksSelected,
    areAnyNetworksSelected,
    networkCount: processedNetworks.length,
    selectedCount: selectedNetworks.length,
  };
};

/**
 * Base hook that provides shared logic for both network hooks
 */
const useNetworksBase = ({
  networkType,
  namespace,
  enabledNetworksForNamespace,
}: UseNetworksBaseOptions) => {
  const networkConfigurations = useNetworkConfigurations(networkType);
  const filteredNetworkConfigurations = useFilteredNetworkConfigurations(
    networkConfigurations,
    namespace,
    networkType,
  );
  const processedNetworks = useProcessedNetworks(
    filteredNetworkConfigurations,
    enabledNetworksForNamespace,
    networkType,
  );
  const statistics = useNetworkStatistics(processedNetworks);

  return {
    networks: processedNetworks,
    ...statistics,
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

  return useNetworksBase({
    networkType,
    namespace: namespace as KnownCaipNamespace,
    enabledNetworksForNamespace: enabledNetworksForCurrentNamespace,
  });
};

/**
 * Helper function to calculate total enabled networks across all namespaces
 */
const useTotalEnabledNetworksCount = (
  enabledNetworksByNamespace:
    | Record<string, Record<string, boolean>>
    | undefined,
) =>
  useMemo(() => {
    if (!enabledNetworksByNamespace) return 0;

    return Object.values(enabledNetworksByNamespace).reduce(
      (total, namespaceNetworks) => {
        if (!namespaceNetworks || typeof namespaceNetworks !== 'object')
          return total;

        const enabledCount = Object.values(namespaceNetworks).filter(
          (isEnabled) => isEnabled === true,
        ).length;

        return total + enabledCount;
      },
      0,
    );
  }, [enabledNetworksByNamespace]);

/**
 * Filters and processes networks based on a specified namespace (EVM, Bitcoin, etc).
 * Enriches network data with selection state and UI-ready properties.
 * @param options.networkType - Filter by popular or custom networks
 * @param options.namespace - The specific namespace to filter networks by
 * @returns Processed networks with selection state and aggregated statistics, including total enabled networks across all namespaces
 * @example
 * const { networks, areAllNetworksSelected, totalEnabledNetworksCount } = useNetworksByCustomNamespace({
 *   networkType: NetworkType.Popular,
 *   namespace: KnownCaipNamespace.Eip155
 * });
 *
 * // totalEnabledNetworksCount gives you the count of all networks with true values across all namespaces
 * // For example: {"eip155": {"0x1": true, "0x38": true}, "solana": {"solana:xyz": true}} = 3 total
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

  const totalEnabledNetworksCount = useTotalEnabledNetworksCount(
    enabledNetworksByNamespace,
  );

  const baseResult = useNetworksBase({
    networkType,
    namespace,
    enabledNetworksForNamespace,
  });

  return {
    ...baseResult,
    totalEnabledNetworksCount,
  };
};
