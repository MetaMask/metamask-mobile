import { ImageSourcePropType } from 'react-native';
import { Hex } from '@metamask/utils';
import { NETWORK_CHAIN_ID } from '../../../../../util/networks/customNetworks';

import FlareMainnetImg from '../../../../../images/flare-mainnet.png';
import SongbirdImg from '../../../../../images/songbird.png';
import ApeNetworkImg from '../../../../../images/ape-network.png';
import GravityImg from '../../../../../images/gravity.png';
import LineaImg from '../../../../../images/linea-mainnet-logo.png';
import KaiaImg from '../../../../../images/kaia.png';
import XrpLevmImg from '../../../../../images/xrp-logo.png';

export const CustomNetworkNativeImgMapping: Record<Hex, ImageSourcePropType> = {
  [NETWORK_CHAIN_ID.FLARE_MAINNET]: FlareMainnetImg,
  [NETWORK_CHAIN_ID.SONGBIRD_TESTNET]: SongbirdImg,
  [NETWORK_CHAIN_ID.APE_CHAIN_TESTNET]: ApeNetworkImg,
  [NETWORK_CHAIN_ID.APE_CHAIN_MAINNET]: ApeNetworkImg,
  [NETWORK_CHAIN_ID.GRAVITY_ALPHA_MAINNET]: GravityImg,
  [NETWORK_CHAIN_ID.LINEA_MAINNET]: LineaImg,
  [NETWORK_CHAIN_ID.KAIA_MAINNET]: KaiaImg,
  [NETWORK_CHAIN_ID.KAIA_KAIROS_TESTNET]: KaiaImg,
  [NETWORK_CHAIN_ID.XRPLEVM_TESTNET]: XrpLevmImg,
};
