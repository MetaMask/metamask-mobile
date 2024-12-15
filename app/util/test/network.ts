// TODO: This is intentionally the old network state, and could be

import {
  NetworkMetadata,
  NetworkState,
  NetworkStatus,
  RpcEndpointType,
} from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import { v4 as uuidv4 } from 'uuid';

export const mockNetworkState = (
  ...networks: {
    id?: string;
    chainId: Hex;
    rpcUrl?: string;
    nickname?: string;
    ticker?: string;
    type?: RpcEndpointType;
    blockExplorerUrl?: string;
    metadata?: NetworkMetadata;
  }[]
): NetworkState => {
  if (
    new Set(networks.map((network) => network.chainId)).size !== networks.length
  ) {
    throw TypeError(
      "mockNetworkState doesn't currently support multiple rpc urls per chain id",
    );
  }

  const networkConfigurations = networks.map((network) => {
    const blockExplorer =
      !('blockExplorerUrl' in network) || network.blockExplorerUrl
        ? network.blockExplorerUrl ??
          `https://localhost/blockExplorer/${network.chainId}`
        : undefined;

    const rpc =
      'rpcUrl' in network
        ? network.rpcUrl
        : `https://localhost/rpc/${network.chainId}`;
    return {
      chainId: network.chainId,
      blockExplorerUrls: blockExplorer ? [blockExplorer] : [],
      defaultBlockExplorerUrlIndex: blockExplorer ? 0 : undefined,
      rpcEndpoints: [
        {
          networkClientId: network.id ?? uuidv4(),
          type: network.type ?? RpcEndpointType.Custom,
          url: rpc,
        },
      ],
      defaultRpcEndpointIndex: 0,
      name: 'nickname' in network ? network.nickname : 'mainnet',
      nativeCurrency: 'ticker' in network ? network.ticker : 'ETH',
    };
  });

  const networksMetadata = networks.reduce(
    (acc, network, i) => ({
      ...acc,
      [networkConfigurations[i].rpcEndpoints[0].networkClientId]:
        network.metadata ?? {
          EIPS: {},
          status: NetworkStatus.Available,
        },
    }),
    {},
  );

  return {
    selectedNetworkClientId:
      networkConfigurations[0].rpcEndpoints[0].networkClientId,
    networkConfigurationsByChainId: networkConfigurations.reduce(
      (acc, network) => ({ ...acc, [network.chainId]: network }),
      {},
    ),
    networksMetadata,
  };
};
