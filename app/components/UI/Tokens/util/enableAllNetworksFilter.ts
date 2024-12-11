import { NetworkConfiguration } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import { NETWORK_CHAIN_ID, PopularList } from '../../../../util/networks/customNetworks';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export type KnownNetworkConfigurations = {
  [K in (typeof NETWORK_CHAIN_ID)[keyof typeof NETWORK_CHAIN_ID]]: NetworkConfiguration;
};

export function enableAllNetworksFilter(
  networks: Partial<KnownNetworkConfigurations>,
) {
  const allOpts: Record<Hex, boolean> = {};
  Object.keys(networks).forEach((chainId) => {
    const hexChainId = chainId as Hex;

    const isPopularNetwork = PopularList.some(
      (item) => item.chainId === hexChainId,
    );

    if (
      isPopularNetwork ||
      hexChainId === CHAIN_IDS.MAINNET ||
      hexChainId === CHAIN_IDS.LINEA_MAINNET
    ) {
      allOpts[hexChainId] = true;
    }
  });
  return allOpts;
}
