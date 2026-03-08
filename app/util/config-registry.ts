import type {
  ConfigRegistryControllerState,
  RegistryNetworkConfig,
} from '@metamask/config-registry-controller';
import { add0x, parseCaipChainId, KnownCaipNamespace } from '@metamask/utils';

/**
 * Default state for ConfigRegistryController when no persisted state exists.
 */
export function getDefaultConfigRegistryControllerState(): ConfigRegistryControllerState {
  return {
    configs: { networks: {} },
    version: null,
    lastFetched: null,
    etag: null,
  };
}

/**
 * Shape used by the "Additional networks" / Popular list UI (CustomNetworkView).
 * Compatible with Network from CustomNetwork.types.
 */
export interface PopularListNetworkShape {
  chainId: string;
  nickname: string;
  rpcUrl: string;
  rpcPrefs: {
    blockExplorerUrl: string;
    imageUrl?: string;
    imageSource?: unknown;
  };
  ticker: string;
  failoverRpcUrls?: string[];
  warning?: boolean;
}

/**
 * Converts a RegistryNetworkConfig (EVM only) to PopularListNetworkShape.
 * Returns null for non-EVM or when default RPC URL is missing.
 */
export function registryConfigToPopularListShape(
  config: RegistryNetworkConfig,
): PopularListNetworkShape | null {
  const { namespace } = parseCaipChainId(config.chainId as `eip155:${string}`);
  if (namespace !== KnownCaipNamespace.Eip155) {
    return null;
  }
  const reference = config.chainId.split(':')[1];
  const hexChainId = add0x(
    Number.parseInt(reference, 10).toString(16),
  ) as `0x${string}`;

  const defaultRpc = config.rpcProviders?.default;
  if (!defaultRpc?.url) {
    return null;
  }

  const blockExplorerUrl = config.blockExplorerUrls?.default ?? '';
  const nativeCurrency = config.assets?.native?.symbol ?? 'ETH';

  return {
    chainId: hexChainId,
    nickname: config.name,
    rpcUrl: defaultRpc.url,
    rpcPrefs: {
      blockExplorerUrl,
      imageUrl: config.imageUrl ?? undefined,
    },
    ticker: nativeCurrency,
  };
}

/**
 * Filters featured registry configs to those not already in networkConfigurations.
 * Returns configs that can be shown as "addable" in the Additional networks list.
 */
export function getNetworksToAddFromFeatured(
  featuredList: RegistryNetworkConfig[],
  networkConfigurationsByChainId: Record<string, unknown>,
): RegistryNetworkConfig[] {
  return featuredList.filter((config) => {
    const shape = registryConfigToPopularListShape(config);
    if (!shape) {
      return false;
    }
    const hexChainId = shape.chainId;
    return !(hexChainId in networkConfigurationsByChainId);
  });
}

/**
 * Maps a RegistryNetworkConfig to PopularListNetworkShape for display.
 * Returns null for non-EVM or missing default RPC (caller should filter).
 */
export function addNetworkFieldsToPopularListShape(
  config: RegistryNetworkConfig,
): PopularListNetworkShape {
  const shape = registryConfigToPopularListShape(config);
  if (!shape) {
    throw new Error(
      `Cannot convert non-EVM or invalid config to PopularListShape: ${config.chainId}`,
    );
  }
  return shape;
}
