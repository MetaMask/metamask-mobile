import { NetworkType } from '@metamask/controller-utils';

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
  MAINNET: '0x1',
  OPTIMISM: '0xa',
  BSC: '0x38',
  POLYGON: '0x89',
  FANTOM: '0xfa',
  BASE: '0x2105',
  ARBITRUM: '0xa4b1',
  AVAXCCHAIN: '0xa86a',
  CELO: '0xa4ec',
  HARMONY: '0x63564c40',
  SEPOLIA: '0xaa36a7',
  LINEA_GOERLI: '0xe704',
  GOERLI: '0x5',
  LINEA_MAINNET: '0xe708',
  ZKSYNC_ERA: '0x144',
};
