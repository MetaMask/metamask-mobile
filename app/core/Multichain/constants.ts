import { CaipChainId } from '@metamask/utils';
import {
  BtcAccountType,
  BtcScope,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';
import BTC from '../../images/bitcoin-logo.png';
import BTC_SVG from '../../images/bitcoin-logo.svg';
import BTC_TESTNET from '../../images/bitcoin-testnet-logo.svg';
import SOL from '../../images/solana-logo.png';
import SOL_TESTNET from '../../images/solana-testnet-logo.svg';
import SOL_DEVNET from '../../images/solana-devnet-logo.svg';
import ETH from '../../images/eth-logo-new.png';
import LINEA_TESTNET from '../../images/linea-testnet-logo.png';
import LINEA_MAINNET from '../../images/linea-mainnet-logo.png';
import BNB from '../../images/bnb.svg';
import POL from '../../images/pol.png';
import AVAX from '../../images/avalanche.png';
import AETH from '../../images/arbitrum.svg';
import FTM from '../../images/fantom.png';
import HARMONY_ONE from '../../images/harmony.png';
import OPTIMISM from '../../images/optimism.png';
import PALM from '../../images/palm.png';
import CELO from '../../images/celo.svg';
import GNOSIS from '../../images/gnosis.svg';
import ZK_SYNC_ERA from '../../images/zk-sync.svg';
import BASE from '../../images/base.png';
import ACALA from '../../images/acala-network-logo.svg';
import ARBITRUM_NOVA from '../../images/arbitrum-nova-logo.svg';
import ASTAR from '../../images/astar-logo.svg';
import BAHAMUT from '../../images/bahamut.png';
import BLACKFORT from '../../images/blackfort.png';
import CANTO from '../../images/canto.svg';
import CONFLUX_ESPACE from '../../images/conflux.svg';
import CORE_BLOCKCHAIN_MAINNET from '../../images/core.svg';
import CRONOS from '../../images/cronos.svg';
import DEXALOT_SUBNET from '../../images/dexalot-subnet.svg';
import DFK_CHAIN from '../../images/dfk.png';
import DOGECHAIN from '../../images/dogechain.jpeg';
import ENDURANCE_SMART_CHAIN_MAINNET from
  '../../images/endurance-smart-chain-mainnet.png';
import ETHEREUM_CLASSIC_MAINNET from '../../images/eth_classic.svg';
import EVMOS from '../../images/evmos.svg';
import FLARE_MAINNET from '../../images/flare-mainnet.svg';
import FUSE_GOLD_MAINNET from '../../images/fuse-mainnet.jpg';
import HAQQ_NETWORK from '../../images/haqq.svg';
import IOTEX_MAINNET from '../../images/iotex.svg';
import KCC_MAINNET from '../../images/kcc-mainnet.svg';
import KAIA_MAINNET from '../../images/kaia.png';
import FUNKICHAIN from '../../images/funkichain.svg';
import KROMA_MAINNET from '../../images/kroma.svg';
import LIGHT_LINK from '../../images/lightlink.svg';
import MANTA_PACIFIC_MAINNET from '../../images/manta.svg';
import MANTLE from '../../images/mantle.svg';
import MOONBEAM from '../../images/moonbeam.svg';
import MOONRIVER from '../../images/moonriver.svg';
import NEAR_AURORA_MAINNET from '../../images/near-aurora.svg';
import NEBULA_MAINNET from '../../images/nebula.svg';
import OASYS_MAINNET from '../../images/oasys.svg';
import OKXCHAIN_MAINNET from '../../images/okx.svg';
import PGN_MAINNET from '../../images/pgn.svg';
import ZKEVM_MAINNET from '../../images/polygon-zkevm.svg';
import PULSECHAIN_MAINNET from '../../images/pulse.svg';
import SHARDEUM_LIBERTY_2X from '../../images/shardeum-2.svg';
import SHARDEUM_SPHINX_1X from '../../images/shardeum-1.svg';
import SHIB_MAINNET from '../../images/shiba.svg';
import SONGBIRD_MAINNET from '../../images/songbird.png';
import STEP_NETWORK from '../../images/step.svg';
import TELOS_EVM_MAINNET from '../../images/telos.svg';
import TENET from '../../images/tenet.svg';
import VELAS_EVM_MAINNET from '../../images/velas.svg';
import ZKATANA from '../../images/zkatana.png';
import ZORA_MAINNET from '../../images/zora.svg';
import FILECOIN from '../../images/filecoin.svg';
import NUMBERS from '../../images/numbers-mainnet.svg';
import SEI from '../../images/sei.svg';
import NEAR from '../../images/near.svg';
import B3 from '../../images/b3.svg';
import APE from '../../images/ape.svg';
import GRAVITY from '../../images/gravity.png';
import LISK from '../../images/lisk.svg';
import LISK_SEPOLIA from '../../images/lisk_sepolia.svg';
import INK_SEPOLIA from '../../images/ink-sepolia.svg';
import INK from '../../images/ink.svg';
import SONIC_MAINNET from '../../images/sonic.svg';
import SONEIUM from '../../images/soneium.png';
import MODE_SEPOLIA from '../../images/mode-sepolia.svg';
import MODE from '../../images/mode.svg';
import SHAPE_SEPOLIA from '../../images/shape-sepolia.svg';
import SHAPE from '../../images/shape.svg';
import UNICHAIN from '../../images/unichain.svg';
import MEGAETH_TESTNET from '../../images/megaeth-testnet-logo.png';
import XRPLEVM_TESTNET from '../../images/xrplevm.png';
import LENS from '../../images/lens.png';
import PLUME from '../../images/plume.svg';

import { MultichainBlockExplorerFormatUrls } from './networks';
import { SvgProps } from 'react-native-svg';
import { ImageSourcePropType } from 'react-native';

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


type ImageMap = Record<string, ImageSourcePropType | React.FC<SvgProps & { name: string }>>;

export const CHAIN_ID_TO_NETWORK_IMAGE_URL_MAP: ImageMap = {
  [CHAIN_IDS.MAINNET]: ETH,
  [CHAIN_IDS.LINEA_GOERLI]: LINEA_TESTNET,
  [CHAIN_IDS.LINEA_SEPOLIA]: LINEA_TESTNET,
  [CHAIN_IDS.LINEA_MAINNET]: LINEA_MAINNET,
  [CHAIN_IDS.AVALANCHE]: AVAX,
  [CHAIN_IDS.BSC]: BNB,
  [CHAIN_IDS.POLYGON]: POL,
  [CHAIN_IDS.ARBITRUM]: AETH,
  [CHAIN_IDS.FANTOM]: FTM,
  [CHAIN_IDS.HARMONY]: HARMONY_ONE,
  [CHAIN_IDS.OPTIMISM]: OPTIMISM,
  [CHAIN_IDS.PALM]: PALM,
  [CHAIN_IDS.CELO]: CELO,
  [CHAIN_IDS.GNOSIS]: GNOSIS,
  [CHAIN_IDS.ZKSYNC_ERA]: ZK_SYNC_ERA,
  [CHAIN_IDS.MEGAETH_TESTNET]: MEGAETH_TESTNET,
  [CHAIN_IDS.NEAR]: NEAR,
  [CHAIN_IDS.NEAR_TESTNET]: NEAR,
  [CHAINLIST_CHAIN_IDS_MAP.ACALA_NETWORK]: ACALA,
  [CHAINLIST_CHAIN_IDS_MAP.ARBITRUM_NOVA]: ARBITRUM_NOVA,
  [CHAINLIST_CHAIN_IDS_MAP.ASTAR]: ASTAR,
  [CHAINLIST_CHAIN_IDS_MAP.BAHAMUT_MAINNET]: BAHAMUT,
  [CHAINLIST_CHAIN_IDS_MAP.BLACKFORT_EXCHANGE_NETWORK]: BLACKFORT,
  [CHAINLIST_CHAIN_IDS_MAP.CANTO]: CANTO,
  [CHAINLIST_CHAIN_IDS_MAP.CONFLUX_ESPACE]: CONFLUX_ESPACE,
  [CHAINLIST_CHAIN_IDS_MAP.CORE_BLOCKCHAIN_MAINNET]:
    CORE_BLOCKCHAIN_MAINNET,
  [CHAIN_IDS.CRONOS]: CRONOS,
  [CHAINLIST_CHAIN_IDS_MAP.DEXALOT_SUBNET]: DEXALOT_SUBNET,
  [CHAINLIST_CHAIN_IDS_MAP.DFK_CHAIN]: DFK_CHAIN,
  [CHAINLIST_CHAIN_IDS_MAP.DOGECHAIN_MAINNET]: DOGECHAIN,
  [CHAINLIST_CHAIN_IDS_MAP.ENDURANCE_SMART_CHAIN_MAINNET]:
    ENDURANCE_SMART_CHAIN_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.ETHEREUM_CLASSIC_MAINNET]:
    ETHEREUM_CLASSIC_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.EVMOS]: EVMOS,
  [CHAINLIST_CHAIN_IDS_MAP.FLARE_MAINNET]: FLARE_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.FUSE_GOLD_MAINNET]: FUSE_GOLD_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.IOTEX_MAINNET]: IOTEX_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.HAQQ_NETWORK]: HAQQ_NETWORK,
  [CHAINLIST_CHAIN_IDS_MAP.KCC_MAINNET]: KCC_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.KAIA_MAINNET]: KAIA_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.FUNKICHAIN]: FUNKICHAIN,
  [CHAINLIST_CHAIN_IDS_MAP.KROMA_MAINNET]: KROMA_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.LIGHTLINK_PHOENIX_MAINNET]: LIGHT_LINK,
  [CHAINLIST_CHAIN_IDS_MAP.MANTA_PACIFIC_MAINNET]:
    MANTA_PACIFIC_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.MANTLE]: MANTLE,
  [CHAINLIST_CHAIN_IDS_MAP.MOONBEAM]: MOONBEAM,
  [CHAINLIST_CHAIN_IDS_MAP.MOONRIVER]: MOONRIVER,
  [CHAINLIST_CHAIN_IDS_MAP.NEAR_AURORA_MAINNET]: NEAR_AURORA_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.NEBULA_MAINNET]: NEBULA_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.OASYS_MAINNET]: OASYS_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.OKXCHAIN_MAINNET]: OKXCHAIN_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.PGN_PUBLIC_GOODS_NETWORK]: PGN_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.POLYGON_ZKEVM]: ZKEVM_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.PULSECHAIN_MAINNET]: PULSECHAIN_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.SHARDEUM_LIBERTY_2X]: SHARDEUM_LIBERTY_2X,
  [CHAINLIST_CHAIN_IDS_MAP.SHARDEUM_SPHINX_1X]: SHARDEUM_SPHINX_1X,
  [CHAINLIST_CHAIN_IDS_MAP.SHIB_MAINNET]: SHIB_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.SONGBIRD_CANARY_NETWORK]: SONGBIRD_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.STEP_NETWORK]: STEP_NETWORK,
  [CHAINLIST_CHAIN_IDS_MAP.TELOS_EVM_MAINNET]: TELOS_EVM_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.TENET]: TENET,
  [CHAINLIST_CHAIN_IDS_MAP.VELAS_EVM_MAINNET]: VELAS_EVM_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.ZKATANA]: ZKATANA,
  [CHAINLIST_CHAIN_IDS_MAP.ZORA_MAINNET]: ZORA_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.FILECOIN]: FILECOIN,
  [CHAINLIST_CHAIN_IDS_MAP.APE_TESTNET]: APE,
  [CHAINLIST_CHAIN_IDS_MAP.APE_MAINNET]: APE,
  [CHAINLIST_CHAIN_IDS_MAP.BASE]: BASE,
  [CHAINLIST_CHAIN_IDS_MAP.NUMBERS]: NUMBERS,
  [CHAINLIST_CHAIN_IDS_MAP.SEI]: SEI,
  [CHAINLIST_CHAIN_IDS_MAP.B3]: B3,
  [CHAINLIST_CHAIN_IDS_MAP.B3_TESTNET]: B3,
  [CHAINLIST_CHAIN_IDS_MAP.GRAVITY_ALPHA_MAINNET]:
    GRAVITY,
  [CHAINLIST_CHAIN_IDS_MAP.GRAVITY_ALPHA_TESTNET_SEPOLIA]:
    GRAVITY,
  [CHAINLIST_CHAIN_IDS_MAP.LISK]: LISK,
  [CHAINLIST_CHAIN_IDS_MAP.LISK_SEPOLIA]: LISK_SEPOLIA,
  [CHAINLIST_CHAIN_IDS_MAP.INK_SEPOLIA]: INK_SEPOLIA,
  [CHAINLIST_CHAIN_IDS_MAP.INK]: INK,
  [CHAINLIST_CHAIN_IDS_MAP.SONIC_MAINNET]: SONIC_MAINNET,
  [CHAINLIST_CHAIN_IDS_MAP.SONEIUM_MAINNET]: SONEIUM,
  [CHAINLIST_CHAIN_IDS_MAP.SONEIUM_TESTNET]: SONEIUM,
  [CHAINLIST_CHAIN_IDS_MAP.MODE_SEPOLIA]: MODE_SEPOLIA,
  [CHAINLIST_CHAIN_IDS_MAP.MODE]: MODE,
  [CHAINLIST_CHAIN_IDS_MAP.SHAPE]: SHAPE,
  [CHAINLIST_CHAIN_IDS_MAP.SHAPE_SEPOLIA]: SHAPE_SEPOLIA,
  [CHAINLIST_CHAIN_IDS_MAP.UNICHAIN]: UNICHAIN,
  [CHAINLIST_CHAIN_IDS_MAP.UNICHAIN_SEPOLIA]: UNICHAIN,
  [MultichainNetworks.SOLANA]: SOL,
  [CHAINLIST_CHAIN_IDS_MAP.XRPLEVM_TESTNET]: XRPLEVM_TESTNET,
  [CHAIN_IDS.LENS]: LENS,
  [CHAIN_IDS.PLUME]: PLUME,
} as const;

export const MULTICHAIN_TOKEN_IMAGE_MAP: ImageMap = {
  [MultichainNetworks.BITCOIN]: BTC_SVG,
  [MultichainNetworks.BITCOIN_TESTNET]: BTC_TESTNET,
  [MultichainNetworks.SOLANA]: SOL,
  [MultichainNetworks.SOLANA_DEVNET]: SOL_DEVNET,
  [MultichainNetworks.SOLANA_TESTNET]: SOL_TESTNET,
} as const;
