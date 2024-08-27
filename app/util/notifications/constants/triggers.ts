export enum ChainId {
  ETHEREUM = 1,
  ETHEREUM_ROPSTEN = 3,
  ETHEREUM_RINKEBY = 4,
  ETHEREUM_GOERLI = 5,
  ETHEREUM_HOLESKY = 17000,
  CRONOS = 25,
  ETHEREUM_KOVAN = 42,
  OPTIMISM = 10,
  OPTIMISM_KOVAN = 69,
  GNOSIS = 100,
  ARBITRUM = 42161,
  ARBITRUM_TESTNET = 421611,
  BSC = 56,
  BSC_TESTNET = 97,
  MOONBEAM = 1284,
  MOONRIVER = 1285,
  POLYGON = 137,
  POLYGON_MUMBAI = 80001,
  FANTOM = 250,
  FANTOM_TESTNET = 4002,
  CELO = 42220,
  AVALANCHE = 43114,
  AVALANCHE_FUJI = 43113,
  ZKSYNC = 324,
  ZKSYNC_TESTNET = 280,
  AURORA = 1313161554,
  AURORA_TESTNET = 1313161555,
  HARMONY_ZERO = 1666600000,
  HARMONY_ONE = 1666600001,
  HARMONY_TWO = 1666600002,
  HARMONY_THREE = 1666600003,
  PALM = 11297108109,
  PALM_TESTNET = 11297108099,
  HECO = 128,
  HECO_TESTNET = 256,
  LINEA_TESTNET = 59140,
  POLYGON_ZKEVM = 1101,
  LINEA = 59144,
  BASE = 8453,
  BASE_TESTNET = 84531,
  SCROLL = 534352,
}

export enum TRIGGER_TYPES {
  FEATURES_ANNOUNCEMENT = 'features_announcement',
  METAMASK_SWAP_COMPLETED = 'metamask_swap_completed',
  ERC20_SENT = 'erc20_sent',
  ERC20_RECEIVED = 'erc20_received',
  ETH_SENT = 'eth_sent',
  ETH_RECEIVED = 'eth_received',
  ROCKETPOOL_STAKE_COMPLETED = 'rocketpool_stake_completed',
  ROCKETPOOL_UNSTAKE_COMPLETED = 'rocketpool_unstake_completed',
  LIDO_STAKE_COMPLETED = 'lido_stake_completed',
  LIDO_WITHDRAWAL_REQUESTED = 'lido_withdrawal_requested',
  LIDO_WITHDRAWAL_COMPLETED = 'lido_withdrawal_completed',
  LIDO_STAKE_READY_TO_BE_WITHDRAWN = 'lido_stake_ready_to_be_withdrawn',
  ERC721_SENT = 'erc721_sent',
  ERC721_RECEIVED = 'erc721_received',
  ERC1155_SENT = 'erc1155_sent',
  ERC1155_RECEIVED = 'erc1155_received',
}

export const chains = {
  ETHEREUM: `${ChainId.ETHEREUM}`,
  OPTIMISM: `${ChainId.OPTIMISM}`,
  BSC: `${ChainId.BSC}`,
  POLYGON: `${ChainId.POLYGON}`,
  ARBITRUM: `${ChainId.ARBITRUM}`,
  AVALANCHE: `${ChainId.AVALANCHE}`,
  LINEA: `${ChainId.LINEA}`,
};

export const SUPPORTED_CHAINS = [
  chains.ETHEREUM,
  chains.OPTIMISM,
  chains.BSC,
  chains.POLYGON,
  chains.ARBITRUM,
  chains.AVALANCHE,
  chains.LINEA,
];

export interface Trigger {
  supported_chains: (typeof SUPPORTED_CHAINS)[number][];
}

export const TRIGGERS: Partial<Record<TRIGGER_TYPES, Trigger>> = {
  [TRIGGER_TYPES.METAMASK_SWAP_COMPLETED]: {
    supported_chains: [
      chains.ETHEREUM,
      chains.OPTIMISM,
      chains.BSC,
      chains.POLYGON,
      chains.ARBITRUM,
      chains.AVALANCHE,
    ],
  },
  [TRIGGER_TYPES.ERC20_SENT]: {
    supported_chains: [
      chains.ETHEREUM,
      chains.OPTIMISM,
      chains.BSC,
      chains.POLYGON,
      chains.ARBITRUM,
      chains.AVALANCHE,
      chains.LINEA,
    ],
  },
  [TRIGGER_TYPES.ERC20_RECEIVED]: {
    supported_chains: [
      chains.ETHEREUM,
      chains.OPTIMISM,
      chains.BSC,
      chains.POLYGON,
      chains.ARBITRUM,
      chains.AVALANCHE,
      chains.LINEA,
    ],
  },
  [TRIGGER_TYPES.ERC721_SENT]: {
    supported_chains: [chains.ETHEREUM, chains.POLYGON],
  },
  [TRIGGER_TYPES.ERC721_RECEIVED]: {
    supported_chains: [chains.ETHEREUM, chains.POLYGON],
  },
  [TRIGGER_TYPES.ERC1155_SENT]: {
    supported_chains: [chains.ETHEREUM, chains.POLYGON],
  },
  [TRIGGER_TYPES.ERC1155_RECEIVED]: {
    supported_chains: [chains.ETHEREUM, chains.POLYGON],
  },
  [TRIGGER_TYPES.ETH_SENT]: {
    supported_chains: [
      chains.ETHEREUM,
      chains.OPTIMISM,
      chains.BSC,
      chains.POLYGON,
      chains.ARBITRUM,
      chains.AVALANCHE,
      chains.LINEA,
    ],
  },
  [TRIGGER_TYPES.ETH_RECEIVED]: {
    supported_chains: [
      chains.ETHEREUM,
      chains.OPTIMISM,
      chains.BSC,
      chains.POLYGON,
      chains.ARBITRUM,
      chains.AVALANCHE,
      chains.LINEA,
    ],
  },
  [TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED]: {
    supported_chains: [chains.ETHEREUM],
  },
  [TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED]: {
    supported_chains: [chains.ETHEREUM],
  },
  [TRIGGER_TYPES.LIDO_STAKE_COMPLETED]: {
    supported_chains: [chains.ETHEREUM],
  },
  [TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED]: {
    supported_chains: [chains.ETHEREUM],
  },
  [TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED]: {
    supported_chains: [chains.ETHEREUM],
  },
};

export enum TRIGGER_DATA_TYPES {
  DATA_FEATURE_ANNOUNCEMENT = 'data_feature_announcement',
  DATA_METAMASK_SWAP_COMPLETED = 'data_metamask_swap_completed',
  DATA_STAKE = 'data_stake',
  DATA_LIDO_STAKE_READY_TO_BE_WITHDRAWN = 'data_lido_stake_ready_to_be_withdrawn',
  DATA_ETH = 'data_eth',
  DATA_ERC20 = 'data_erc20',
  DATA_ERC721 = 'data_erc721',
  DATA_ERC1155 = 'data_erc1155',
}
