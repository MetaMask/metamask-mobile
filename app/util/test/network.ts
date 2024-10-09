// TODO: This is intentionally the old network state, and could be

import { NetworkMetadata, NetworkStatus } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import { v4 as uuidv4 } from 'uuid';

export const mockNetworkState = (
  ...networks: {
    id?: string;
    type?: string;
    chainId: Hex;
    rpcUrl?: string;
    nickname?: string;
    ticker?: string;
    blockExplorerUrl?: string;
    metadata?: NetworkMetadata;
  }[]
) => {
  const networkConfigurations = networks.map((network) => ({
    id: network.id ?? uuidv4(),
    chainId: network.chainId,
    rpcUrl:
      'rpcUrl' in network
        ? network.rpcUrl
        : `https://localhost/rpc/${network.chainId}`,
    nickname: network.nickname ?? '',

    ticker: network.ticker ?? '',

    ...((!('blockExplorerUrl' in network) || network.blockExplorerUrl) && {
      rpcPrefs: {
        blockExplorerUrl:
          network.blockExplorerUrl ??
          `https://localhost/blockExplorer/${network.chainId}`,
      },
    }),
  }));

  const networksMetadata = networks.reduce(
    (acc, network, i) => ({
      ...acc,
      [networkConfigurations[i].id]: network.metadata ?? {
        EIPS: {},
        status: NetworkStatus.Available,
      },
    }),
    {},
  );

  return {
    selectedNetworkClientId: networkConfigurations[0].id,
    networkConfigurations: networkConfigurations.reduce(
      (acc, network) => ({ ...acc, [network.id]: network }),
      {},
    ),
    networksMetadata,
  };
};
