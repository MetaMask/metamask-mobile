import { NetworkConfiguration } from '@metamask/network-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { PopularList } from '../../../util/networks/customNetworks';

export const getNetworkConfigurationsToPoll = (
  networkConfigurations: Record<string, NetworkConfiguration>,
  currentChainId: Hex,
  isAllNetworksSelected: boolean,
): NetworkConfiguration[] => {
  // determine if the current chain is popular
  const isPopular = PopularList.some(
    (popular) =>
      popular.chainId === currentChainId ||
      currentChainId === CHAIN_IDS.MAINNET ||
      currentChainId === CHAIN_IDS.LINEA_MAINNET,
  );

  // filter out networks that are not popular, mainnet or linea mainnet
  return Object.values(networkConfigurations).reduce(
    (acc: NetworkConfiguration[], network) => {
      if (
        isPopular ||
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
