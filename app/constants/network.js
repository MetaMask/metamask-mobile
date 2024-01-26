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

/**
 * @enum {string}
 */
export const NETWORKS_CHAIN_ID_WITH_SVG = {
  MAINNET: '1',
  OPTIMISM: '10',
  BSC: '56',
  POLYGON: '137',
  FANTOM: '250',
  BASE: '8453',
  ARBITRUM: '42161',
  AVAXCCHAIN: '43114',
  CELO: '42220',
  LINEA_MAINNET: '59144',
  ZKSYNC_ERA: '324',
  ACALA_NETWORK: '787',
  ARBITRUM_NOVA: '42170',
  ARBITRUM_ONE: '42161',
  ASTAR: '592',
  CANTO: '7700',
  CONFLUX: '1030',
  CORE_MAINNET: '1116',
  CRONOS: '25',
  DEXALOT: '432204',
  ETH_CLASSIC: '61',
  EVMOS: '9001',
  FLARE: '14',
  FUSE: '122',
  GNOSIS: '100',
  HAQQ: '11235',
  KAVA: '2222',
  KCC: '321',
  KLAYTN: '8217',
  KROMA: '255',
  LIGHT_LINK: '1890',
  MANTA: '169',
  MANTLE: '5000',
  MOONBEAM: '1284',
  MOONRIVER: '1285',
  NEAR_AURORA: '1313161554',
  NEBULA: '1482601649',
  OASYS: '248',
  OKX: '66',
  OP_BNB: '204',
  PGN: '424',
  ZKEVM_POLYGON: '1101',
  PULSE: '369',
  SCROLL: '534352',
  SHARDEUM: '8081',
  SHARDEUM_SPHINX: '8082',
  SHIB: '27',
  SONGBIRD: '19',
  STEP_NETWORK: '1234',
  TAIKO: '167008',
  TENET: '1559',
  VELAS: '106',
  ZORA: '7777777',
};
