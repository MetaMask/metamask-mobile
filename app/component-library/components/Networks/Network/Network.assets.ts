/* eslint-disable import/prefer-default-export */
import ETHEREUM from '../../../../../app/images/eth-logo-new.svg';
import LINEA_MAINNET from '../../../../../app/images/linea-mainnet-logo.svg';
import ACALA_NETWORK_1 from '../../../../../app/images/acala-logo.svg';
import ARBITRUM_NOVA from '../../../../../app/images/arbitrum-nova-logo.svg';
import ARBITRUM_ONE from '../../../../../app/images/arbitrum-one-logo.svg';
import ASTAR from '../../../../../app/images/astar-logo.svg';
import AVALANCHE from '../../../../../app/images/avalance-logo.svg';
import BASE from '../../../../../app/images/base-logo.svg';
import BSC from '../../../../../app/images/binance-logo.svg';
import CANTO from '../../../../../app/images/canto-logo.svg';
import CELO from '../../../../../app/images/celo-logo.svg';
import CONFLUX from '../../../../../app/images/conflux-logo.svg';
import CORE_MAINNET from '../../../../../app/images/core-logo.svg';
import CRONOS from '../../../../../app/images/cronos-logo.svg';
import DEXALOT from '../../../../../app/images/dexalot-logo.svg';
import ETH_CLASSIC from '../../../../../app/images/ethereum-classic-logo.svg';
import EVMOS from '../../../../../app/images/evmos-logo.svg';
import FANTOM from '../../../../../app/images/fantom-logo.svg';
import FLARE from '../../../../../app/images/flare-logo.svg';
import FUSE from '../../../../../app/images/fuse-logo.svg';
import GNOSIS from '../../../../../app/images/gnosis-logo.svg';
import HAQQ from '../../../../../app/images/haqq-logo.svg';
import KAVA from '../../../../../app/images/kava-logo.svg';
import KCC from '../../../../../app/images/kcc-logo.svg';
import KLAYTN from '../../../../../app/images/klaytnn-logo.svg';
import KROMA from '../../../../../app/images/kroma-logo.svg';
import LIGHT_LINK from '../../../../../app/images/lightlink-logo.svg';
import MANTA from '../../../../../app/images/manta-logo.svg';
import MANTLE from '../../../../../app/images/mantle-logo.svg';
import MOONBEAM from '../../../../../app/images/moonbeam-logo.svg';
import MOONRIVER from '../../../../../app/images/moonriver-logo.svg';
import NEAR_AURORA from '../../../../../app/images/near-aurora-logo.svg';
import NEBULA from '../../../../../app/images/nebula-logo.svg';
import OASYS from '../../../../../app/images/oasys-logo.svg';
import OKX from '../../../../../app/images/okx-logo.svg';
import OP_BNB from '../../../../../app/images/op-bnb-logo.svg';
import OPTIMISM from '../../../../../app/images/optimism-logo.svg';
import PGN from '../../../../../app/images/pgn-logo.svg';
import POLYGON from '../../../../../app/images/polygon-logo.svg';
import ZKEVM_POLYGON from '../../../../../app/images/polygon-zkevm-logo.svg';
import PULSE from '../../../../../app/images/pulse-chain-logo.svg';
import SCROLL from '../../../../../app/images/scroll-logo.svg';
import SHARDEUM from '../../../../../app/images/shardeum-logo.svg';
import SHARDEUM_SPHINX from '../../../../../app/images/shardeum-sphynx-logo.svg';
import SHIB from '../../../../../app/images/shib-logo.svg';
import SONGBIRD from '../../../../../app/images/songbird-logo.svg';
import STEP_NETWORK from '../../../../../app/images/step-network-logo.svg';
import TAIKO from '../../../../../app/images/taiko-logo.svg';
import TENET from '../../../../../app/images/telnet-logo.svg';
import VELAS from '../../../../../app/images/velas-logo.svg';
import ZKSYNC_ERA from '../../../../../app/images/zksync-era-logo.svg';
import ZORA from '../../../../../app/images/zora-logo.svg';

import { NETWORKS_CHAIN_ID_WITH_SVG } from '../../../../constants/network';

import { NetworkByIconName } from './Network.types';

/**
 * Network stored by chainId
 */
export const networkByChainID: NetworkByIconName = {
  [NETWORKS_CHAIN_ID_WITH_SVG.MAINNET]: ETHEREUM,
  [NETWORKS_CHAIN_ID_WITH_SVG.LINEA_MAINNET]: LINEA_MAINNET,
  [NETWORKS_CHAIN_ID_WITH_SVG.ACALA_NETWORK]: ACALA_NETWORK_1,
  [NETWORKS_CHAIN_ID_WITH_SVG.ARBITRUM_NOVA]: ARBITRUM_NOVA,
  [NETWORKS_CHAIN_ID_WITH_SVG.ARBITRUM_ONE]: ARBITRUM_ONE,
  [NETWORKS_CHAIN_ID_WITH_SVG.ASTAR]: ASTAR,
  [NETWORKS_CHAIN_ID_WITH_SVG.AVAXCCHAIN]: AVALANCHE,
  [NETWORKS_CHAIN_ID_WITH_SVG.BASE]: BASE,
  [NETWORKS_CHAIN_ID_WITH_SVG.BSC]: BSC,
  [NETWORKS_CHAIN_ID_WITH_SVG.CANTO]: CANTO,
  [NETWORKS_CHAIN_ID_WITH_SVG.CELO]: CELO,
  [NETWORKS_CHAIN_ID_WITH_SVG.CONFLUX]: CONFLUX,
  [NETWORKS_CHAIN_ID_WITH_SVG.CONFLUX]: CONFLUX,
  [NETWORKS_CHAIN_ID_WITH_SVG.CORE_MAINNET]: CORE_MAINNET,
  [NETWORKS_CHAIN_ID_WITH_SVG.CRONOS]: CRONOS,
  [NETWORKS_CHAIN_ID_WITH_SVG.DEXALOT]: DEXALOT,
  [NETWORKS_CHAIN_ID_WITH_SVG.ETH_CLASSIC]: ETH_CLASSIC,
  [NETWORKS_CHAIN_ID_WITH_SVG.ETH_CLASSIC]: ETH_CLASSIC,
  [NETWORKS_CHAIN_ID_WITH_SVG.EVMOS]: EVMOS,
  [NETWORKS_CHAIN_ID_WITH_SVG.FANTOM]: FANTOM,
  [NETWORKS_CHAIN_ID_WITH_SVG.FLARE]: FLARE,
  [NETWORKS_CHAIN_ID_WITH_SVG.FUSE]: FUSE,
  [NETWORKS_CHAIN_ID_WITH_SVG.GNOSIS]: GNOSIS,
  [NETWORKS_CHAIN_ID_WITH_SVG.HAQQ]: HAQQ,
  [NETWORKS_CHAIN_ID_WITH_SVG.KAVA]: KAVA,
  [NETWORKS_CHAIN_ID_WITH_SVG.KCC]: KCC,
  [NETWORKS_CHAIN_ID_WITH_SVG.KLAYTN]: KLAYTN,
  [NETWORKS_CHAIN_ID_WITH_SVG.KROMA]: KROMA,
  [NETWORKS_CHAIN_ID_WITH_SVG.LIGHT_LINK]: LIGHT_LINK,
  [NETWORKS_CHAIN_ID_WITH_SVG.MANTA]: MANTA,
  [NETWORKS_CHAIN_ID_WITH_SVG.MANTLE]: MANTLE,
  [NETWORKS_CHAIN_ID_WITH_SVG.MOONBEAM]: MOONBEAM,
  [NETWORKS_CHAIN_ID_WITH_SVG.MOONRIVER]: MOONRIVER,
  [NETWORKS_CHAIN_ID_WITH_SVG.NEAR_AURORA]: NEAR_AURORA,
  [NETWORKS_CHAIN_ID_WITH_SVG.NEBULA]: NEBULA,
  [NETWORKS_CHAIN_ID_WITH_SVG.OASYS]: OASYS,
  [NETWORKS_CHAIN_ID_WITH_SVG.OKX]: OKX,
  [NETWORKS_CHAIN_ID_WITH_SVG.OP_BNB]: OP_BNB,
  [NETWORKS_CHAIN_ID_WITH_SVG.OPTIMISM]: OPTIMISM,
  [NETWORKS_CHAIN_ID_WITH_SVG.PGN]: PGN,
  [NETWORKS_CHAIN_ID_WITH_SVG.POLYGON]: POLYGON,
  [NETWORKS_CHAIN_ID_WITH_SVG.ZKEVM_POLYGON]: ZKEVM_POLYGON,
  [NETWORKS_CHAIN_ID_WITH_SVG.PULSE]: PULSE,
  [NETWORKS_CHAIN_ID_WITH_SVG.SCROLL]: SCROLL,
  [NETWORKS_CHAIN_ID_WITH_SVG.SHARDEUM]: SHARDEUM,
  [NETWORKS_CHAIN_ID_WITH_SVG.SHARDEUM_SPHINX]: SHARDEUM_SPHINX,
  [NETWORKS_CHAIN_ID_WITH_SVG.SHIB]: SHIB,
  [NETWORKS_CHAIN_ID_WITH_SVG.SONGBIRD]: SONGBIRD,
  [NETWORKS_CHAIN_ID_WITH_SVG.STEP_NETWORK]: STEP_NETWORK,
  [NETWORKS_CHAIN_ID_WITH_SVG.TAIKO]: TAIKO,
  [NETWORKS_CHAIN_ID_WITH_SVG.TENET]: TENET,
  [NETWORKS_CHAIN_ID_WITH_SVG.VELAS]: VELAS,
  [NETWORKS_CHAIN_ID_WITH_SVG.ZKSYNC_ERA]: ZKSYNC_ERA,
  [NETWORKS_CHAIN_ID_WITH_SVG.ZORA]: ZORA,
};
