import { NetworkConfiguration } from '@metamask/network-controller';
import { HexString } from '../types';
import { NETWORK_CHAIN_ID } from '../../../../util/networks/networks';

const testnets: HexString[] = [
  NETWORK_CHAIN_ID.GOERLI,
  NETWORK_CHAIN_ID.SEPOLIA,
  NETWORK_CHAIN_ID.BSC_TESTNET,
  NETWORK_CHAIN_ID.POLYGON_TESTNET,
  NETWORK_CHAIN_ID.OPTIMISM_TESTNET,
  NETWORK_CHAIN_ID.ARBITRUM_GOERLI,
  NETWORK_CHAIN_ID.BASE_GOERLI,
  NETWORK_CHAIN_ID.LINEA_GOERLI,
  NETWORK_CHAIN_ID.LINEA_SEPOLIA,
  NETWORK_CHAIN_ID.LINEA_MAINNET,
];

type KnownNetworkConfigurations = {
  [K in (typeof NETWORK_CHAIN_ID)[keyof typeof NETWORK_CHAIN_ID]]: NetworkConfiguration;
};

export const enableAllNetworksFilter = (
  networks: KnownNetworkConfigurations,
  excludeChainIds: boolean = false,
): Record<HexString, boolean> => {
  const allOpts: Record<HexString, boolean> = {};
  Object.keys(networks).forEach((chainId) => {
    const hexChainId = chainId as HexString;
    if (excludeChainIds && testnets.includes(hexChainId)) {
      return;
    }
    allOpts[hexChainId] = true;
  });
  return allOpts;
};
