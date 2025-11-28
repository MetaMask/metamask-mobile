import { CaipChainId, Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Network } from '../../components/Views/Settings/NetworksSettings/NetworkSettings/CustomNetworkView/CustomNetwork.types';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  BtcScope,
  SolScope,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxScope,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-api';

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

export const QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME = {
  'ethereum-mainnet': () => process.env.QUICKNODE_MAINNET_URL,
  'linea-mainnet': () => process.env.QUICKNODE_LINEA_MAINNET_URL,
  'arbitrum-mainnet': () => process.env.QUICKNODE_ARBITRUM_URL,
  'avalanche-mainnet': () => process.env.QUICKNODE_AVALANCHE_URL,
  'optimism-mainnet': () => process.env.QUICKNODE_OPTIMISM_URL,
  'polygon-mainnet': () => process.env.QUICKNODE_POLYGON_URL,
  'base-mainnet': () => process.env.QUICKNODE_BASE_URL,
  'bsc-mainnet': () => process.env.QUICKNODE_BSC_URL,
  'sei-mainnet': () => process.env.QUICKNODE_SEI_URL,
};

export function getFailoverUrlsForInfuraNetwork(
  infuraNetwork: keyof typeof QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME,
) {
  const url = QUICKNODE_ENDPOINT_URLS_BY_INFURA_NETWORK_NAME[infuraNetwork]();
  if (url) {
    return [url];
  }
  return [];
}

export const PopularList = [
  {
    chainId: toHex('43114'),
    nickname: 'Avalanche',
    rpcUrl: `https://avalanche-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('avalanche-mainnet'),
    ticker: 'AVAX',
    rpcPrefs: {
      blockExplorerUrl: 'https://snowtrace.io',
      imageUrl: 'AVAX',
      imageSource: require('../../images/avalanche.png'),
    },
  },
  {
    chainId: toHex('42161'),
    nickname: 'Arbitrum',
    rpcUrl: `https://arbitrum-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('arbitrum-mainnet'),
    ticker: 'ETH',
    rpcPrefs: {
      blockExplorerUrl: 'https://arbiscan.io',
      imageUrl: 'AETH',
      imageSource: require('../../images/arbitrum.png'),
    },
  },
  {
    chainId: toHex('56'),
    nickname: 'BNB Chain',
    rpcUrl: `https://bsc-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('bsc-mainnet'),
    ticker: 'BNB',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://bscscan.com',
      imageUrl: 'BNB',
      imageSource: require('../../images/binance.png'),
    },
  },
  {
    chainId: toHex('8453'),
    nickname: 'Base',
    rpcUrl: `https://base-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('base-mainnet'),
    ticker: 'ETH',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://basescan.org',
      imageUrl: 'BASE',
      imageSource: require('../../images/base.png'),
    },
  },
  {
    chainId: toHex('999'),
    nickname: 'HyperEVM',
    rpcUrl: 'https://rpc.hyperliquid.xyz/evm',
    failoverRpcUrls: [],
    ticker: 'HYPE',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://hyperevmscan.io/',
      imageUrl: 'HYPE',
      imageSource: require('../../images/hyperevm.png'),
    },
  },
  {
    chainId: toHex('10'),
    nickname: 'OP',
    rpcUrl: `https://optimism-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('optimism-mainnet'),
    ticker: 'ETH',
    rpcPrefs: {
      blockExplorerUrl: 'https://optimistic.etherscan.io',
      imageUrl: 'OPTIMISM',
      imageSource: require('../../images/optimism.png'),
    },
  },
  {
    chainId: toHex('11297108109'),
    nickname: 'Palm',
    rpcUrl: `https://palm-mainnet.infura.io/v3/${infuraProjectId}`,
    ticker: 'PALM',
    rpcPrefs: {
      blockExplorerUrl: 'https://palm.chainlens.com',
      imageUrl: 'PALM',
      imageSource: require('../../images/palm.png'),
    },
  },
  {
    chainId: toHex('137'),
    nickname: 'Polygon',
    rpcUrl: `https://polygon-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('polygon-mainnet'),
    ticker: 'POL',
    rpcPrefs: {
      blockExplorerUrl: 'https://polygonscan.com',
      imageUrl: 'POL',
      imageSource: require('../../images/pol.png'),
    },
  },
  {
    chainId: toHex('324'),
    nickname: 'zkSync Era',
    rpcUrl: `https://mainnet.era.zksync.io`,
    ticker: 'ETH',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.zksync.io/',
      imageUrl: 'ZK_SYNC',
      imageSource: require('../../images/zk-sync.png'),
    },
  },
  {
    chainId: toHex('1329'),
    nickname: 'Sei',
    rpcUrl: `https://sei-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: getFailoverUrlsForInfuraNetwork('sei-mainnet'),
    ticker: 'SEI',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://seitrace.com/',
      imageUrl: 'SEI',
      imageSource: require('../../images/sei.png'),
    },
  },
  {
    chainId: toHex('143'),
    nickname: 'Monad',
    rpcUrl: `https://monad-mainnet.infura.io/v3/${infuraProjectId}`,
    failoverRpcUrls: [],
    ticker: 'MON',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://monadscan.com/',
      imageUrl: 'MON',
      imageSource: require('../../images/monad-mainnet-logo.png'),
    },
  },
  {
    chainId: toHex('4326'),
    nickname: 'MegaEth',
    rpcUrl: `https://mainnet.megaeth.com/rpc`,
    failoverRpcUrls: [],
    ticker: 'ETH',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.megaeth.com',
      imageUrl: 'MEGAETH',
      imageSource: require('../../images/megaeth-mainnet-logo.png'),
    },
  },
];

/**
 * Filters the PopularList to exclude networks with blacklisted chain IDs.
 * Allows to remove a network from the additional network selection.
 * @param blacklistedChainIds - Array of chain IDs to exclude from the list
 * @returns Filtered array of network configurations
 */
export const getFilteredPopularNetworks = (
  blacklistedChainIds: string[],
  baseNetworkList: Network[] = PopularList,
) => {
  if (!Array.isArray(blacklistedChainIds) || blacklistedChainIds.length === 0) {
    return baseNetworkList;
  }

  return baseNetworkList.filter(
    (network) => !blacklistedChainIds.includes(network.chainId),
  );
};

export const getNonEvmNetworkImageSourceByChainId = (chainId: CaipChainId) => {
  switch (chainId) {
    case SolScope.Mainnet:
      return require('../../images/solana-logo.png');
    case SolScope.Devnet:
      return require('../../images/solana-devnet.jpg');
    case BtcScope.Mainnet:
      return require('../../images/bitcoin-logo.png');
    case BtcScope.Testnet:
    case BtcScope.Testnet4:
    case BtcScope.Regtest:
      return require('../../images/bitcoin-testnet-logo.png');
    case BtcScope.Signet:
      return require('../../images/bitcoin-signet-logo.svg');
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    case TrxScope.Mainnet:
      return require('../../images/tron.png');
    case TrxScope.Nile:
      return require('../../images/tron.png');
    case TrxScope.Shasta:
      return require('../../images/tron.png');
    ///: END:ONLY_INCLUDE_IF(tron)
    default:
      return undefined;
  }
};

export const INFURA_TESTNET_CHAIN_IDS = {
  GOERLI: '0x5',
  LINEA_GOERLI: '0xe704',
  SEPOLIA: '0xaa36a7',
  HOODI: '0x88bb0',
  LINEA_SEPOLIA: '0xe705',
  AMOY: '0x13882',
  BASE_SEPOLIA: '0x14a34',
  OPTIMISM_SEPOLIA: '0xaa37dc',
  ARBITRUM_SEPOLIA: '0x66eee',
  PALM_TESTNET: '0x2a15c3083',
  AVALANCHE_TESTNET: '0xa869',
  CELO_TESTNET: '0xaef3',
  ZK_SYNC_ERA_TESTNET: '0x12c',
  BSC_TESTNET: '0x61',
  MANTA_SEPOLIA: '0x138b',
  OPBNB_TESTNET: '0x15eb',
  SCROLL_SEPOLIA: '0x8274f',
  UNICHAIN_SEPOLIA: '0x515',
} as const;

export const infuraChainIdsTestNets: string[] = [
  INFURA_TESTNET_CHAIN_IDS.GOERLI,
  INFURA_TESTNET_CHAIN_IDS.LINEA_GOERLI,
  INFURA_TESTNET_CHAIN_IDS.SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.HOODI,
  INFURA_TESTNET_CHAIN_IDS.LINEA_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.AMOY,
  INFURA_TESTNET_CHAIN_IDS.BASE_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.OPTIMISM_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.ARBITRUM_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.PALM_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.AVALANCHE_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.CELO_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.ZK_SYNC_ERA_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.BSC_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.MANTA_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.OPBNB_TESTNET,
  INFURA_TESTNET_CHAIN_IDS.SCROLL_SEPOLIA,
  INFURA_TESTNET_CHAIN_IDS.UNICHAIN_SEPOLIA,
];

export const allowedInfuraHosts = [
  // Ethereum
  'mainnet.infura.io',
  // Linea
  'linea-mainnet.infura.io',
  // Polygon
  'polygon-mainnet.infura.io',
  // Base
  'base-mainnet.infura.io',
  // Blast
  'blast-mainnet.infura.io',
  // Optimism
  'optimism-mainnet.infura.io',
  // Arbitrum
  'arbitrum-mainnet.infura.io',
  // Palm
  'palm-mainnet.infura.io',
  // Avalanche
  'avalanche-mainnet.infura.io',
  // Celo
  'celo-mainnet.infura.io',
  // ZKSync
  'zksync-mainnet.infura.io',
  // BSC
  'bsc-mainnet.infura.io',
  // Mantle
  'mantle-mainnet.infura.io',
  // OPBNB
  'opbnb-mainnet.infura.io',
  // Scroll
  'scroll-mainnet.infura.io',
];

/**
 * List of popularList will change in the future, removing networks from the list will lead to users not
 * seeing the logo of the network anymore.
 * We can keep this new list updated with any network removed from the popular list so we keep returning the logo of the network.
 */
export const UnpopularNetworkList = [
  {
    chainId: toHex('250'),
    nickname: 'Fantom Opera',
    rpcUrl: 'https://rpc.ftm.tools/',
    ticker: 'FTM',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://ftmscan.com',
      imageUrl: 'FTM',
      imageSource: require('../../images/fantom.png'),
    },
  },
  {
    chainId: toHex('1666600000'),
    nickname: 'Harmony Mainnet Shard 0',
    rpcUrl: 'https://api.harmony.one/',
    ticker: 'ONE',
    warning: true,
    rpcPrefs: {
      blockExplorerUrl: 'https://explorer.harmony.one',
      imageUrl: 'ONE',
      imageSource: require('../../images/harmony.png'),
    },
  },
];

export const NETWORK_CHAIN_ID: {
  readonly FLARE_MAINNET: '0xe';
  readonly SONGBIRD_TESTNET: '0x13';
  readonly APECHAIN_TESTNET: '0x8157';
  readonly APECHAIN_MAINNET: '0x8173';
  readonly GRAVITY_ALPHA_MAINNET: '0x659';
  readonly KAIA_MAINNET: '0x2019';
  readonly KAIA_KAIROS_TESTNET: '0x3e9';
  readonly SONEIUM_MAINNET: '0x74c';
  readonly SONEIUM_MINATO_TESTNET: '0x79a';
  readonly XRPLEVM_TESTNET: '0x161c28';
  readonly SEI_MAINNET: '0x531';
  readonly MONAD_MAINNET: '0x8f';
  readonly MATCHAIN_MAINNET: '0x2ba';
  readonly FLOW_MAINNET: '0x2eb';
  readonly LENS: '0xe8';
  readonly PLUME: '0x18232';
  readonly GENESYS: '0x407b';
  readonly KATANA: '0xb67d2';
  readonly SOPHON: '0xc3b8';
  readonly SOPHON_TESTNET: '0x1fa72e78';
  readonly BERACHAIN: '0x138de';
  readonly EDU: '0xa3c3';
  readonly ABSTRACT: '0xab5';
  readonly NOMINA: '0xa6';
  readonly XRPLEVM: '0x15f900';
  readonly FRAXTAL: '0xfc';
  readonly XDC: '0x32';
  readonly MEGAETH_MAINNET: '0x10e6';
  readonly HEMI: '0xa867';
  readonly LUKSO: '0x2a';
  readonly INJECTIVE: '0x6f0';
  readonly PLASMA: '0x2611';
  readonly CRONOS: '0x19';
  readonly HYPE: '0x3e7';
} & typeof CHAIN_IDS = {
  FLARE_MAINNET: '0xe',
  SONGBIRD_TESTNET: '0x13',
  APECHAIN_TESTNET: '0x8157',
  APECHAIN_MAINNET: '0x8173',
  GRAVITY_ALPHA_MAINNET: '0x659',
  KAIA_MAINNET: '0x2019',
  KAIA_KAIROS_TESTNET: '0x3e9',
  SONEIUM_MAINNET: '0x74c',
  SONEIUM_MINATO_TESTNET: '0x79a',
  XRPLEVM_TESTNET: '0x161c28',
  SEI_MAINNET: '0x531',
  MONAD_MAINNET: '0x8f',
  MATCHAIN_MAINNET: '0x2ba',
  FLOW_MAINNET: '0x2eb',
  LENS: '0xe8',
  PLUME: '0x18232',
  GENESYS: '0x407b',
  KATANA: '0xb67d2',
  SOPHON: '0xc3b8',
  SOPHON_TESTNET: '0x1fa72e78',
  BERACHAIN: '0x138de',
  EDU: '0xa3c3',
  ABSTRACT: '0xab5',
  NOMINA: '0xa6',
  XRPLEVM: '0x15f900',
  FRAXTAL: '0xfc',
  XDC: '0x32',
  MEGAETH_MAINNET: '0x10e6',
  HEMI: '0xa867',
  LUKSO: '0x2a',
  INJECTIVE: '0x6f0',
  PLASMA: '0x2611',
  CRONOS: '0x19',
  HYPE: '0x3e7',
  ...CHAIN_IDS,
};

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
export const CustomNetworkImgMapping: Record<Hex, string> = {
  [NETWORK_CHAIN_ID.FLARE_MAINNET]: require('../../images/flare-mainnet.png'),
  [NETWORK_CHAIN_ID.SONGBIRD_TESTNET]: require('../../images/songbird.png'),
  [NETWORK_CHAIN_ID.APECHAIN_TESTNET]: require('../../images/apechain.png'),
  [NETWORK_CHAIN_ID.APECHAIN_MAINNET]: require('../../images/apechain.png'),
  [NETWORK_CHAIN_ID.GRAVITY_ALPHA_MAINNET]: require('../../images/gravity.png'),
  [NETWORK_CHAIN_ID.LINEA_MAINNET]: require('../../images/linea-mainnet-logo.png'),
  [NETWORK_CHAIN_ID.KAIA_MAINNET]: require('../../images/kaia.png'),
  [NETWORK_CHAIN_ID.KAIA_KAIROS_TESTNET]: require('../../images/kaia.png'),
  [NETWORK_CHAIN_ID.SONEIUM_MINATO_TESTNET]: require('../../images/soneium.png'),
  [NETWORK_CHAIN_ID.SONEIUM_MAINNET]: require('../../images/soneium.png'),
  [NETWORK_CHAIN_ID.XRPLEVM_TESTNET]: require('../../images/xrplevm.png'),
  [NETWORK_CHAIN_ID.SEI_MAINNET]: require('../../images/sei.png'),
  [NETWORK_CHAIN_ID.MONAD_MAINNET]: require('../../images/monad-mainnet-logo.png'),
  [NETWORK_CHAIN_ID.MATCHAIN_MAINNET]: require('../../images/matchain.png'),
  [NETWORK_CHAIN_ID.FLOW_MAINNET]: require('../../images/flow.png'),
  [NETWORK_CHAIN_ID.LENS]: require('../../images/lens.png'),
  [NETWORK_CHAIN_ID.PLUME]: require('../../images/plume.png'),
  [NETWORK_CHAIN_ID.GENESYS]: require('../../images/genesys.png'),
  [NETWORK_CHAIN_ID.KATANA]: require('../../images/katana.png'),
  [NETWORK_CHAIN_ID.SOPHON]: require('../../images/sophon.png'),
  [NETWORK_CHAIN_ID.SOPHON_TESTNET]: require('../../images/sophon-testnet.png'),
  [NETWORK_CHAIN_ID.BERACHAIN]: require('../../images/berachain.png'),
  [NETWORK_CHAIN_ID.EDU]: require('../../images/edu.png'),
  [NETWORK_CHAIN_ID.ABSTRACT]: require('../../images/abstract.png'),
  [NETWORK_CHAIN_ID.NOMINA]: require('../../images/nomina.png'),
  [NETWORK_CHAIN_ID.XRPLEVM]: require('../../images/xrplevm.png'),
  [NETWORK_CHAIN_ID.FRAXTAL]: require('../../images/fraxtal.png'),
  [NETWORK_CHAIN_ID.XDC]: require('../../images/xdc.png'),
  [NETWORK_CHAIN_ID.MEGAETH_MAINNET]: require('../../images/megaeth-mainnet-logo.png'),
  [NETWORK_CHAIN_ID.MEGAETH_TESTNET]: require('../../images/megaeth-testnet-logo.png'),
  [NETWORK_CHAIN_ID.HEMI]: require('../../images/hemi.png'),
  [NETWORK_CHAIN_ID.LUKSO]: require('../../images/lukso.png'),
  [NETWORK_CHAIN_ID.INJECTIVE]: require('../../images/injective.png'),
  [NETWORK_CHAIN_ID.PLASMA]: require('../../images/plasma.png'),
  [NETWORK_CHAIN_ID.CRONOS]: require('../../images/cronos.png'),
  [NETWORK_CHAIN_ID.HYPE]: require('../../images/hyperevm.png'),
};
