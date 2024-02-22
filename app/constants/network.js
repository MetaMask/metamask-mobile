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
};

/**
 * @enum {string}
 */
export const NETWORKS_CHAIN_ID_DECIMAL_STRING = {
  MAINNET: '1',
  OPTIMISM: '10',
  BSC: '56',
  POLYGON: '137',
  FANTOM: '250',
  BASE: '8453',
  ARBITRUM: '42161',
  AVAXCCHAIN: '43114',
  CELO: '42220',
  HARMONY: '1666600000',
  SEPOLIA: '11155111',
  LINEA_GOERLI: '59140',
  GOERLI: '5',
  LINEA_MAINNET: '59144',
  ZKSYNC_ERA: '324',
};
