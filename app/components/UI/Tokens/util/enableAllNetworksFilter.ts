import { NetworkConfiguration } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import { NETWORK_CHAIN_ID } from '../../../../util/networks/customNetworks';

export type KnownNetworkConfigurations = {
  [K in (typeof NETWORK_CHAIN_ID)[keyof typeof NETWORK_CHAIN_ID]]: NetworkConfiguration;
};

export function enableAllNetworksFilter(
  networks: Partial<KnownNetworkConfigurations>,
) {
  const allOpts: Record<Hex, boolean> = {};
  Object.keys(networks).forEach((chainId) => {
    const hexChainId = chainId as Hex;
    allOpts[hexChainId] = true;
  });
  return allOpts;
}
