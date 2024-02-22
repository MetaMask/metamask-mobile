import { NetworkType, toHex } from '@metamask/controller-utils';

export const MAINNET = 'mainnet';
export const HOMESTEAD = 'homestead';
export const GOERLI = 'goerli';
export const SEPOLIA = 'sepolia';
export const LINEA_GOERLI = 'linea-goerli';
export const LINEA_MAINNET = 'linea-mainnet';
export const RPC = NetworkType.rpc;
export const NO_RPC_BLOCK_EXPLORER = 'NO_BLOCK_EXPLORER';
export const PRIVATENETWORK = 'PRIVATENETWORK';
export const DEFAULT_MAINNET_CUSTOM_NAME = 'Ethereum Main Custom';
export const IPFS_DEFAULT_GATEWAY_URL = 'https://cloudflare-ipfs.com/ipfs/';

/**
 * @enum {string}
 */
export const NETWORKS_CHAIN_ID = {
  MAINNET: toHex('1'),
  OPTIMISM: toHex('10'),
  BSC: toHex('56'),
  POLYGON: toHex('137'),
  FANTOM: toHex('250'),
  BASE: toHex('8453'),
  ARBITRUM: toHex('42161'),
  AVAXCCHAIN: toHex('43114'),
  CELO: toHex('42220'),
  HARMONY: toHex('1666600000'),
  SEPOLIA: toHex('11155111'),
  LINEA_GOERLI: toHex('59140'),
  GOERLI: toHex('5'),
  LINEA_MAINNET: toHex('59144'),
  ZKSYNC_ERA: toHex('324'),
  ARBITRUM_GOERLI: toHex('421613'),
  OPTIMISM_GOERLI: toHex('420'),
};

// To add a deprecation warning to a network, add it to the array
export const DEPRECATED_NETWORKS = [
  NETWORKS_CHAIN_ID.GOERLI,
  NETWORKS_CHAIN_ID.ARBITRUM_GOERLI,
  NETWORKS_CHAIN_ID.OPTIMISM_GOERLI,
];
