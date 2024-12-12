import { NetworkConfiguration } from '@metamask/network-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';

export const getNetworkConfigurationsToPoll = (
  networkConfigurations: Record<string, NetworkConfiguration>,
  isAllNetworksSelected: boolean,
): NetworkConfiguration[] => {
  const popularNetworksChainIds = PopularList.map((popular) => popular.chainId);

  // filter out networks that are not popular, mainnet or linea mainnet
  return Object.values(networkConfigurations).reduce(
    (acc: NetworkConfiguration[], network) => {
      if (
        // check if the network is popular
        popularNetworksChainIds.includes(network.chainId) ||
        network.chainId === CHAIN_IDS.MAINNET ||
        network.chainId === CHAIN_IDS.LINEA_MAINNET ||
        isAllNetworksSelected
      ) {
        acc.push(network);
      }
      return acc;
    },
    [],
  );
};
