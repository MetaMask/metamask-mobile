import { CaipChainId } from '@metamask/utils';
import {
  BtcAccountType,
  BtcScope,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';
import BTC from '../../images/bitcoin-logo.png';
import SOL from '../../images/solana-logo.png';
import { MultichainBlockExplorerFormatUrls } from './networks';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';

// Image imports for React Native rendering
export const MULTICHAIN_TOKEN_IMAGES = {
  [BtcScope.Mainnet]: BTC,
  [SolScope.Mainnet]: SOL,
  [BtcScope.Testnet]: BTC,
  [SolScope.Devnet]: SOL,
  [SolScope.Testnet]: SOL,
} as const;

export interface ProviderConfigWithImageUrl {
  rpcUrl?: string;
  type: string;
  ticker: string;
  decimal: number;
  nickname?: string;
  rpcPrefs?: { blockExplorerUrl?: string };
  id?: string;
}

export type MultichainNetworkIds = CaipChainId;

export type MultichainProviderConfig = ProviderConfigWithImageUrl & {
  nickname: string;
  chainId: CaipChainId;
  // Variant of block explorer URLs for non-EVM.
  blockExplorerFormatUrls?: MultichainBlockExplorerFormatUrls;
  // NOTE: For now we use a callback to check if the address is compatible with
  // the given network or not
  isAddressCompatible: (address: string) => boolean;
};

export const MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP: Record<
  CaipChainId,
  MultichainBlockExplorerFormatUrls
> = {
  [BtcScope.Mainnet]: {
    url: 'https://mempool.space/',
    address: 'https://mempool.space/address/{address}',
    transaction: 'https://mempool.space/tx/{txId}',
  },
  [BtcScope.Testnet]: {
    url: 'https://mempool.space/',
    address: 'https://mempool.space/testnet/address/{address}',
    transaction: 'https://mempool.space/testnet/tx/{txId}',
  },

  [SolScope.Mainnet]: {
    url: 'https://solscan.io',
    address: 'https://solscan.io/account/{address}',
    transaction: 'https://solscan.io/tx/{txId}',
  },
  [SolScope.Devnet]: {
    url: 'https://solscan.io',
    address: 'https://solscan.io/account/{address}?cluster=devnet',
    transaction: 'https://solscan.io/tx/{txId}?cluster=devnet',
  },
  [SolScope.Testnet]: {
    url: 'https://solscan.io',
    address: 'https://solscan.io/account/{address}?cluster=testnet',
    transaction: 'https://solscan.io/tx/{txId}?cluster=testnet',
  },
} as const;

export const MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET = {
  [BtcAccountType.P2wpkh]: BtcScope.Mainnet,
  [SolAccountType.DataAccount]: SolScope.Mainnet,
} as const;

export const PRICE_API_CURRENCIES = [
  'aud',
  'hkd',
  'sgd',
  'idr',
  'inr',
  'nzd',
  'php',
  'btc',
  'cad',
  'eur',
  'gbp',
  'jpy',
  'ltc',
  'rub',
  'uah',
  'usd',
  'xlm',
  'xrp',
  'sek',
  'aed',
  'ars',
  'bch',
  'bnb',
  'brl',
  'clp',
  'cny',
  'czk',
  'dkk',
  'chf',
  'dot',
  'eos',
  'eth',
  'gel',
  'huf',
  'ils',
  'krw',
  'mxn',
  'myr',
  'ngn',
  'nok',
  'pln',
  'thb',
  'try',
  'zar',
];

export enum MultichainNetworks {
  BITCOIN = BtcScope.Mainnet,
  BITCOIN_TESTNET = BtcScope.Testnet,
  BITCOIN_SIGNET = BtcScope.Signet,

  SOLANA = SolScope.Mainnet,
  SOLANA_DEVNET = SolScope.Devnet,
  SOLANA_TESTNET = SolScope.Testnet,
}

/**
 * An object containing all of the chain ids for networks both built in and
 * those that we have added custom code to support our feature set.
 */
export const CHAIN_IDS = {
  MAINNET: '0x1',
  GOERLI: '0x5',
  LOCALHOST: '0x539',
  BSC: '0x38',
  BSC_TESTNET: '0x61',
  OPTIMISM: '0xa',
  OPTIMISM_TESTNET: '0xaa37dc',
  OPTIMISM_GOERLI: '0x1a4',
  BASE: '0x2105',
  BASE_TESTNET: '0x14a33',
  OPBNB: '0xcc',
  OPBNB_TESTNET: '0x15eb',
  POLYGON: '0x89',
  POLYGON_TESTNET: '0x13881',
  AVALANCHE: '0xa86a',
  AVALANCHE_TESTNET: '0xa869',
  FANTOM: '0xfa',
  FANTOM_TESTNET: '0xfa2',
  CELO: '0xa4ec',
  ARBITRUM: '0xa4b1',
  HARMONY: '0x63564c40',
  PALM: '0x2a15c308d',
  SEPOLIA: '0xaa36a7',
  HOLESKY: '0x4268',
  LINEA_GOERLI: '0xe704',
  LINEA_SEPOLIA: '0xe705',
  AMOY: '0x13882',
  BASE_SEPOLIA: '0x14a34',
  BLAST_SEPOLIA: '0xa0c71fd',
  OPTIMISM_SEPOLIA: '0xaa37dc',
  PALM_TESTNET: '0x2a15c3083',
  CELO_TESTNET: '0xaef3',
  ZK_SYNC_ERA_TESTNET: '0x12c',
  MANTA_SEPOLIA: '0x138b',
  UNICHAIN: '0x82',
  UNICHAIN_SEPOLIA: '0x515',
  LINEA_MAINNET: '0xe708',
  AURORA: '0x4e454152',
  MOONBEAM: '0x504',
  MOONBEAM_TESTNET: '0x507',
  MOONRIVER: '0x505',
  CRONOS: '0x19',
  GNOSIS: '0x64',
  ZKSYNC_ERA: '0x144',
  TEST_ETH: '0x539',
  ARBITRUM_GOERLI: '0x66eed',
  BLAST: '0x13e31',
  FILECOIN: '0x13a',
  POLYGON_ZKEVM: '0x44d',
  SCROLL: '0x82750',
  SCROLL_SEPOLIA: '0x8274f',
  WETHIO: '0x4e',
  CHZ: '0x15b38',
  NUMBERS: '0x290b',
  SEI: '0x531',
  APE_TESTNET: '0x8157',
  APE_MAINNET: '0x8173',
  BERACHAIN: '0x138d5',
  METACHAIN_ONE: '0x1b6e6',
  ARBITRUM_SEPOLIA: '0x66eee',
  NEAR: '0x18d',
  NEAR_TESTNET: '0x18e',
  B3: '0x208d',
  B3_TESTNET: '0x7c9',
  GRAVITY_ALPHA_MAINNET: '0x659',
  GRAVITY_ALPHA_TESTNET_SEPOLIA: '0x34c1',
  LISK: '0x46f',
  LISK_SEPOLIA: '0x106a',
  INK_SEPOLIA: '0xba5eD',
  INK: '0xdef1',
  MODE_SEPOLIA: '0x397',
  MODE: '0x868b',
  MEGAETH_TESTNET: '0x18c6',
  XRPLEVM_TESTNET: '0x161c28',
  LENS: '0xe8',
  PLUME: '0x18232',
} as const;

export const CHAINLIST_CHAIN_IDS_MAP = {
  ...CHAIN_IDS,
  SCROLL: '0x82750',
  TAIKO_JOLNIR_L2_MAINNET: '0x28c5f',
  FANTOM_OPERA: '0xfa',
  CELO_MAINNET: '0xa4ec',
  KAVA_EVM: '0x8ae',
  HARMONY_MAINNET_SHARD_0: '0x63564c40',
  CRONOS_MAINNET_BETA: '0x19',
  Q_MAINNET: '0x8a71',
  HUOBI_ECO_CHAIN_MAINNET: '0x80',
  ACALA_NETWORK: '0x313',
  ARBITRUM_NOVA: '0xa4ba',
  ASTAR: '0x250',
  BAHAMUT_MAINNET: '0x142d',
  BLACKFORT_EXCHANGE_NETWORK: '0x1387',
  CANTO: '0x1e14',
  CONFLUX_ESPACE: '0x406',
  CORE_BLOCKCHAIN_MAINNET: '0x45c',
  DEXALOT_SUBNET: '0x6984c',
  DFK_CHAIN: '0xd2af',
  DOGECHAIN_MAINNET: '0x7d0',
  ENDURANCE_SMART_CHAIN_MAINNET: '0x288',
  ETHEREUM_CLASSIC_MAINNET: '0x3d',
  EVMOS: '0x2329',
  FLARE_MAINNET: '0xe',
  FUSE_GOLD_MAINNET: '0x7a',
  HAQQ_NETWORK: '0x2be3',
  IOTEX_MAINNET: '0x1251',
  KCC_MAINNET: '0x141',
  KAIA_MAINNET: '0x2019',
  FUNKICHAIN: '0x84bb',
  KROMA_MAINNET: '0xff',
  LIGHTLINK_PHOENIX_MAINNET: '0x762',
  MANTA_PACIFIC_MAINNET: '0xa9',
  MANTLE: '0x1388',
  NEAR_AURORA_MAINNET: '0x4e454152',
  NEBULA_MAINNET: '0x585eb4b1',
  OASYS_MAINNET: '0xf8',
  OKXCHAIN_MAINNET: '0x42',
  PGN_PUBLIC_GOODS_NETWORK: '0x1a8',
  PULSECHAIN_MAINNET: '0x171',
  SHARDEUM_LIBERTY_2X: '0x1f91',
  SHARDEUM_SPHINX_1X: '0x1f92',
  SHIB_MAINNET: '0x1b',
  SONGBIRD_CANARY_NETWORK: '0x13',
  STEP_NETWORK: '0x4d2',
  TELOS_EVM_MAINNET: '0x28',
  TENET: '0x617',
  VELAS_EVM_MAINNET: '0x6a',
  ZKATANA: '0x133e40',
  ZORA_MAINNET: '0x76adf1',
  FILECOIN: '0x13a',
  NUMBERS: '0x290b',
  B3: '0x208d',
  B3_TESTNET: '0x7c9',
  APE: '0x8173',
  GRAVITY_ALPHA_MAINNET: '0x659',
  GRAVITY_ALPHA_TESTNET_SEPOLIA: '0x34c1',
  INK_SEPOLIA: '0xba5ed',
  INK: '0xdef1',
  SONIC_MAINNET: '0x92',
  SONEIUM_MAINNET: '0x74c',
  SONEIUM_TESTNET: '0x79a',
  MODE_SEPOLIA: '0x397',
  MODE: '0x868b',
  SHAPE_SEPOLIA: '0x2b03',
  SHAPE: '0x168',
  XRPLEVM_TESTNET: '0x161c28',
} as const;

export const ETH_TOKEN_IMAGE_URL = './app/images/eth-logo-new.png';
export const LINEA_GOERLI_TOKEN_IMAGE_URL = './app/images/linea-testnet-logo.png';
export const LINEA_SEPOLIA_TOKEN_IMAGE_URL = './app/images/linea-testnet-logo.png';
export const LINEA_MAINNET_TOKEN_IMAGE_URL = './app/images/linea-mainnet-logo.png';
export const TEST_ETH_TOKEN_IMAGE_URL = './app/images/black-eth-logo.svg';
export const BNB_TOKEN_IMAGE_URL = './app/images/bnb.svg';
export const POL_TOKEN_IMAGE_URL = './app/images/pol.png';
export const AVAX_TOKEN_IMAGE_URL = './app/images/avalanche.png';
export const AETH_TOKEN_IMAGE_URL = './app/images/arbitrum.svg';
export const FTM_TOKEN_IMAGE_URL = './app/images/fantom.png';
export const HARMONY_ONE_TOKEN_IMAGE_URL = './app/images/harmony.png';
export const OPTIMISM_TOKEN_IMAGE_URL = './app/images/optimism.png';
export const PALM_TOKEN_IMAGE_URL = './app/images/palm.png';
export const CELO_TOKEN_IMAGE_URL = './app/images/celo.svg';
export const GNOSIS_TOKEN_IMAGE_URL = './app/images/gnosis.svg';
export const ZK_SYNC_ERA_TOKEN_IMAGE_URL = './app/images/zk-sync.svg';
export const BASE_TOKEN_IMAGE_URL = './app/images/base.png';
export const ACALA_TOKEN_IMAGE_URL = './app/images/acala-network-logo.svg';
export const ARBITRUM_NOVA_IMAGE_URL = './app/images/arbitrum-nova-logo.svg';
export const ASTAR_IMAGE_URL = './app/images/astar-logo.svg';
export const BAHAMUT_IMAGE_URL = './app/images/bahamut.png';
export const BLACKFORT_IMAGE_URL = './app/images/blackfort.png';
export const CANTO_IMAGE_URL = './app/images/canto.svg';
export const CONFLUX_ESPACE_IMAGE_URL = './app/images/conflux.svg';
export const CORE_BLOCKCHAIN_MAINNET_IMAGE_URL = './app/images/core.svg';
export const CRONOS_IMAGE_URL = './app/images/cronos.svg';
export const DEXALOT_SUBNET_IMAGE_URL = './app/images/dexalot-subnet.svg';
export const DFK_CHAIN_IMAGE_URL = './app/images/dfk.png';
export const DOGECHAIN_IMAGE_URL = './app/images/dogechain.jpeg';
export const ENDURANCE_SMART_CHAIN_MAINNET_IMAGE_URL =
  './app/images/endurance-smart-chain-mainnet.png';
export const ETHEREUM_CLASSIC_MAINNET_IMAGE_URL = './app/images/eth_classic.svg';
export const EVMOS_IMAGE_URL = './app/images/evmos.svg';
export const FLARE_MAINNET_IMAGE_URL = './app/images/flare-mainnet.svg';
export const FUSE_GOLD_MAINNET_IMAGE_URL = './app/images/fuse-mainnet.jpg';
export const HAQQ_NETWORK_IMAGE_URL = './app/images/haqq.svg';
export const IOTEX_MAINNET_IMAGE_URL = './app/images/iotex.svg';
export const IOTEX_TOKEN_IMAGE_URL = './app/images/iotex-token.svg';
export const APE_TOKEN_IMAGE_URL = './app/images/ape-token.png';
export const KCC_MAINNET_IMAGE_URL = './app/images/kcc-mainnet.svg';
export const KAIA_MAINNET_IMAGE_URL = './app/images/kaia.png';
export const FUNKICHAIN_IMAGE_URL = './app/images/funkichain.svg';
export const KROMA_MAINNET_IMAGE_URL = './app/images/kroma.svg';
export const LIGHT_LINK_IMAGE_URL = './app/images/lightlink.svg';
export const MANTA_PACIFIC_MAINNET_IMAGE_URL = './app/images/manta.svg';
export const MANTLE_MAINNET_IMAGE_URL = './app/images/mantle.svg';
export const MOONBEAM_IMAGE_URL = './app/images/moonbeam.svg';
export const MOONRIVER_IMAGE_URL = './app/images/moonriver.svg';
export const MOONBEAM_TOKEN_IMAGE_URL = './app/images/moonbeam-token.svg';
export const MOONRIVER_TOKEN_IMAGE_URL = './app/images/moonriver-token.svg';
export const NEAR_AURORA_MAINNET_IMAGE_URL = './app/images/near-aurora.svg';
export const NEBULA_MAINNET_IMAGE_URL = './app/images/nebula.svg';
export const OASYS_MAINNET_IMAGE_URL = './app/images/oasys.svg';
export const OKXCHAIN_MAINNET_IMAGE_URL = './app/images/okx.svg';
export const PGN_MAINNET_IMAGE_URL = './app/images/pgn.svg';
export const ZKEVM_MAINNET_IMAGE_URL = './app/images/polygon-zkevm.svg';
export const PULSECHAIN_MAINNET_IMAGE_URL = './app/images/pulse.svg';
export const SHARDEUM_LIBERTY_2X_IMAGE_URL = './app/images/shardeum-2.svg';
export const SHARDEUM_SPHINX_1X_IMAGE_URL = './app/images/shardeum-1.svg';
export const SHIB_MAINNET_IMAGE_URL = './app/images/shiba.svg';
export const SONGBIRD_MAINNET_IMAGE_URL = './app/images/songbird.png';
export const STEP_NETWORK_IMAGE_URL = './app/images/step.svg';
export const TELOS_EVM_MAINNET_IMAGE_URL = './app/images/telos.svg';
export const TENET_MAINNET_IMAGE_URL = './app/images/tenet.svg';
export const VELAS_EVM_MAINNET_IMAGE_URL = './app/images/velas.svg';
export const ZKATANA_MAINNET_IMAGE_URL = './app/images/zkatana.png';
export const ZORA_MAINNET_IMAGE_URL = './app/images/zora.svg';
export const FILECOIN_MAINNET_IMAGE_URL = './app/images/filecoin.svg';
export const SCROLL_IMAGE_URL = './app/images/scroll.svg';
export const NUMBERS_MAINNET_IMAGE_URL = './app/images/numbers-mainnet.svg';
export const NUMBERS_TOKEN_IMAGE_URL = './app/images/numbers-token.png';
export const SEI_IMAGE_URL = './app/images/sei.svg';
export const NEAR_IMAGE_URL = './app/images/near.svg';
export const B3_IMAGE_URL = './app/images/b3.svg';
export const APE_IMAGE_URL = './app/images/ape.svg';
export const GRAVITY_ALPHA_MAINNET_IMAGE_URL = './app/images/gravity.png';
export const GRAVITY_ALPHA_TESTNET_SEPOLIA_IMAGE_URL = './app/images/gravity.png';
export const LISK_IMAGE_URL = './app/images/lisk.svg';
export const LISK_SEPOLIA_IMAGE_URL = './app/images/lisk_sepolia.svg';
export const INK_SEPOLIA_IMAGE_URL = './app/images/ink-sepolia.svg';
export const INK_IMAGE_URL = './app/images/ink.svg';
export const SONIC_MAINNET_IMAGE_URL = './app/images/sonic.svg';
export const SONEIUM_IMAGE_URL = './app/images/soneium.png';
export const MODE_SEPOLIA_IMAGE_URL = './app/images/mode-sepolia.svg';
export const MODE_IMAGE_URL = './app/images/mode.svg';
export const SHAPE_SEPOLIA_IMAGE_URL = './app/images/shape-sepolia.svg';
export const SHAPE_IMAGE_URL = './app/images/shape.svg';
export const UNICHAIN_IMAGE_URL = './app/images/unichain.svg';
export const MEGAETH_TESTNET_IMAGE_URL = './app/images/megaeth-testnet-logo.png';
export const SOLANA_IMAGE_URL = './app/images/solana-logo.png';
export const XRPLEVM_TESTNET_IMAGE_URL = './app/images/xrplevm.png';
export const XRP_TOKEN_IMAGE_URL = './app/images/xrp-logo.png';
export const LENS_IMAGE_URL = './app/images/lens.png';
export const LENS_NATIVE_TOKEN_IMAGE_URL = './app/images/lens-native.svg';
export const PLUME_IMAGE_URL = './app/images/plume.svg';
export const PLUME_NATIVE_TOKEN_IMAGE_URL = './app/images/plume-native.svg';


export const CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP: Record<string, string> = {
  [CHAIN_IDS.MAINNET]: ETH_TOKEN_IMAGE_URL,
  [CHAIN_IDS.LINEA_GOERLI]: LINEA_GOERLI_TOKEN_IMAGE_URL,
  [CHAIN_IDS.LINEA_SEPOLIA]: LINEA_SEPOLIA_TOKEN_IMAGE_URL,
  [CHAIN_IDS.LINEA_MAINNET]: LINEA_MAINNET_TOKEN_IMAGE_URL,
  [CHAIN_IDS.AVALANCHE]: AVAX_TOKEN_IMAGE_URL,
  [CHAIN_IDS.BSC]: BNB_TOKEN_IMAGE_URL,
  [CHAIN_IDS.POLYGON]: POL_TOKEN_IMAGE_URL,
  [CHAIN_IDS.ARBITRUM]: AETH_TOKEN_IMAGE_URL,
  [CHAIN_IDS.FANTOM]: FTM_TOKEN_IMAGE_URL,
  [CHAIN_IDS.HARMONY]: HARMONY_ONE_TOKEN_IMAGE_URL,
  [CHAIN_IDS.OPTIMISM]: OPTIMISM_TOKEN_IMAGE_URL,
  [CHAIN_IDS.PALM]: PALM_TOKEN_IMAGE_URL,
  [CHAIN_IDS.CELO]: CELO_TOKEN_IMAGE_URL,
  [CHAIN_IDS.GNOSIS]: GNOSIS_TOKEN_IMAGE_URL,
  [CHAIN_IDS.ZKSYNC_ERA]: ZK_SYNC_ERA_TOKEN_IMAGE_URL,
  [CHAIN_IDS.MEGAETH_TESTNET]: MEGAETH_TESTNET_IMAGE_URL,
  [CHAIN_IDS.NEAR]: NEAR_IMAGE_URL,
  [CHAIN_IDS.NEAR_TESTNET]: NEAR_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.ACALA_NETWORK]: ACALA_TOKEN_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.ARBITRUM_NOVA]: ARBITRUM_NOVA_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.ASTAR]: ASTAR_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.BAHAMUT_MAINNET]: BAHAMUT_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.BLACKFORT_EXCHANGE_NETWORK]: BLACKFORT_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.CANTO]: CANTO_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.CONFLUX_ESPACE]: CONFLUX_ESPACE_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.CORE_BLOCKCHAIN_MAINNET]:
    CORE_BLOCKCHAIN_MAINNET_IMAGE_URL,
  [CHAIN_IDS.CRONOS]: CRONOS_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.DEXALOT_SUBNET]: DEXALOT_SUBNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.DFK_CHAIN]: DFK_CHAIN_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.DOGECHAIN_MAINNET]: DOGECHAIN_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.ENDURANCE_SMART_CHAIN_MAINNET]:
    ENDURANCE_SMART_CHAIN_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.ETHEREUM_CLASSIC_MAINNET]:
    ETHEREUM_CLASSIC_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.EVMOS]: EVMOS_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.FLARE_MAINNET]: FLARE_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.FUSE_GOLD_MAINNET]: FUSE_GOLD_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.IOTEX_MAINNET]: IOTEX_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.HAQQ_NETWORK]: HAQQ_NETWORK_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.KCC_MAINNET]: KCC_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.KAIA_MAINNET]: KAIA_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.FUNKICHAIN]: FUNKICHAIN_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.KROMA_MAINNET]: KROMA_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.LIGHTLINK_PHOENIX_MAINNET]: LIGHT_LINK_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.MANTA_PACIFIC_MAINNET]:
    MANTA_PACIFIC_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.MANTLE]: MANTLE_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.MOONBEAM]: MOONBEAM_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.MOONRIVER]: MOONRIVER_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.NEAR_AURORA_MAINNET]: NEAR_AURORA_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.NEBULA_MAINNET]: NEBULA_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.OASYS_MAINNET]: OASYS_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.OKXCHAIN_MAINNET]: OKXCHAIN_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.PGN_PUBLIC_GOODS_NETWORK]: PGN_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.POLYGON_ZKEVM]: ZKEVM_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.PULSECHAIN_MAINNET]: PULSECHAIN_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.SHARDEUM_LIBERTY_2X]: SHARDEUM_LIBERTY_2X_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.SHARDEUM_SPHINX_1X]: SHARDEUM_SPHINX_1X_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.SHIB_MAINNET]: SHIB_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.SONGBIRD_CANARY_NETWORK]: SONGBIRD_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.STEP_NETWORK]: STEP_NETWORK_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.TELOS_EVM_MAINNET]: TELOS_EVM_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.TENET]: TENET_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.VELAS_EVM_MAINNET]: VELAS_EVM_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.ZKATANA]: ZKATANA_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.ZORA_MAINNET]: ZORA_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.FILECOIN]: FILECOIN_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.APE_TESTNET]: APE_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.APE_MAINNET]: APE_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.BASE]: BASE_TOKEN_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.NUMBERS]: NUMBERS_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.SEI]: SEI_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.B3]: B3_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.B3_TESTNET]: B3_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.GRAVITY_ALPHA_MAINNET]:
    GRAVITY_ALPHA_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.GRAVITY_ALPHA_TESTNET_SEPOLIA]:
    GRAVITY_ALPHA_TESTNET_SEPOLIA_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.LISK]: LISK_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.LISK_SEPOLIA]: LISK_SEPOLIA_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.INK_SEPOLIA]: INK_SEPOLIA_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.INK]: INK_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.SONIC_MAINNET]: SONIC_MAINNET_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.SONEIUM_MAINNET]: SONEIUM_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.SONEIUM_TESTNET]: SONEIUM_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.MODE_SEPOLIA]: MODE_SEPOLIA_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.MODE]: MODE_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.SHAPE]: SHAPE_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.SHAPE_SEPOLIA]: SHAPE_SEPOLIA_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.UNICHAIN]: UNICHAIN_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.UNICHAIN_SEPOLIA]: UNICHAIN_IMAGE_URL,
  [MultichainNetworks.SOLANA]: SOLANA_IMAGE_URL,
  [CHAINLIST_CHAIN_IDS_MAP.XRPLEVM_TESTNET]: XRPLEVM_TESTNET_IMAGE_URL,
  [CHAIN_IDS.LENS]: LENS_IMAGE_URL,
  [CHAIN_IDS.PLUME]: PLUME_IMAGE_URL,
} as const;

// TODO: This data should be provided by the snap
export const BITCOIN_TOKEN_IMAGE_URL = './app/images/bitcoin-logo.svg';
export const BITCOIN_TESTNET_TOKEN_IMAGE_URL =
  './app/images/bitcoin-testnet-logo.svg';
export const SOLANA_TOKEN_IMAGE_URL = './app/images/solana-logo.png';
export const SOLANA_TESTNET_IMAGE_URL = './app/images/solana-testnet-logo.svg';
export const SOLANA_DEVNET_IMAGE_URL = './app/images/solana-devnet-logo.svg';

export const MULTICHAIN_TOKEN_IMAGE_MAP: Record<CaipChainId, string> = {
  [MultichainNetworks.BITCOIN]: BITCOIN_TOKEN_IMAGE_URL,
  [MultichainNetworks.BITCOIN_TESTNET]: BITCOIN_TESTNET_TOKEN_IMAGE_URL,
  [MultichainNetworks.SOLANA]: SOLANA_TOKEN_IMAGE_URL,
  [MultichainNetworks.SOLANA_DEVNET]: SOLANA_DEVNET_IMAGE_URL,
  [MultichainNetworks.SOLANA_TESTNET]: SOLANA_TESTNET_IMAGE_URL,
} as const;
