import type {
  ConfigRegistryControllerState,
  RegistryNetworkConfig,
} from '@metamask/config-registry-controller';
import {
  RpcEndpointType,
  type AddNetworkCustomRpcEndpointFields,
  type InfuraRpcEndpoint,
} from '@metamask/network-controller';
import { add0x, parseCaipChainId, KnownCaipNamespace } from '@metamask/utils';
import type { ImageSourcePropType } from 'react-native';

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
    imageSource?: ImageSourcePropType;
  };
  ticker: string;
  failoverRpcUrls?: string[];
  warning?: boolean;
  /**
   * Present and `RpcEndpointType.Infura` when the registry marks the default
   * provider as an Infura provider. NetworkController rebuilds the URL for
   * Infura endpoints from the networkClientId and the real project ID; saving
   * these as Custom endpoints would call the `{infuraProjectId}` placeholder
   * URL verbatim and get rejected by Infura.
   */
  rpcEndpointType?: RpcEndpointType;
  networkClientId?: string;
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
    ...(defaultRpc.type === RpcEndpointType.Infura
      ? {
          rpcEndpointType: RpcEndpointType.Infura,
          networkClientId: defaultRpc.networkClientId,
        }
      : {}),
  };
}

/**
 * Builds the `rpcEndpoints` entry for `NetworkController.addNetwork` from a
 * popular-list network. Mirrors `registryConfigToAddNetworkFields` in the
 * extension (`ui/selectors/config-registry/config-registry.ts`): registry
 * networks whose default provider is an Infura provider must be added as
 * Infura endpoints (NetworkController rebuilds their URL from the
 * networkClientId and the real project ID); saving them as Custom endpoints
 * would call the `{infuraProjectId}` placeholder URL verbatim and get
 * rejected by Infura.
 *
 * The cast is needed because InfuraRpcEndpoint.url is typed as a template
 * over the stale InfuraNetworkType list, so registry networks not in that
 * list (e.g. 'arc-mainnet') cannot be assigned directly.
 */
export function buildAddNetworkRpcEndpoint(
  network: Pick<
    PopularListNetworkShape,
    | 'nickname'
    | 'rpcUrl'
    | 'failoverRpcUrls'
    | 'rpcEndpointType'
    | 'networkClientId'
  >,
): [InfuraRpcEndpoint | AddNetworkCustomRpcEndpointFields] {
  return [
    network.rpcEndpointType === RpcEndpointType.Infura
      ? ({
          type: RpcEndpointType.Infura,
          networkClientId: network.networkClientId,
          failoverUrls: network.failoverRpcUrls,
          url: `https://${network.networkClientId}.infura.io/v3/{infuraProjectId}`,
        } as InfuraRpcEndpoint)
      : {
          type: RpcEndpointType.Custom,
          url: network.rpcUrl,
          failoverUrls: network.failoverRpcUrls,
          name: network.nickname,
        },
  ];
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
