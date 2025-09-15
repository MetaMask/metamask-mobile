import { ImageSourcePropType } from 'react-native';
import { Hex } from '@metamask/utils';
import { NETWORK_CHAIN_ID } from '../../../../../util/networks/customNetworks';

import ethImg from '../../../../../images/eth-logo-new.png';
import FlareMainnetImg from '../../../../../images/flare-mainnet.png';
import SongbirdImg from '../../../../../images/songbird.png';
import ApeNetworkImg from '../../../../../images/apechain.png';
import GravityImg from '../../../../../images/gravity.png';
import KaiaImg from '../../../../../images/kaia.png';
import XrpLevmImg from '../../../../../images/xrp-logo.png';
import SophonImg from '../../../../../images/sophon.png';
import SophonTestnetImg from '../../../../../images/sophon-testnet.png';
import CreditcoinImg from '../../../../../images/creditcoin.png';

export const CustomNetworkNativeImgMapping: Record<Hex, ImageSourcePropType> = {
  [NETWORK_CHAIN_ID.FLARE_MAINNET]: FlareMainnetImg,
  [NETWORK_CHAIN_ID.SONGBIRD_TESTNET]: SongbirdImg,
  [NETWORK_CHAIN_ID.APECHAIN_TESTNET]: ApeNetworkImg,
  [NETWORK_CHAIN_ID.APECHAIN_MAINNET]: ApeNetworkImg,
  [NETWORK_CHAIN_ID.GRAVITY_ALPHA_MAINNET]: GravityImg,
  [NETWORK_CHAIN_ID.KAIA_MAINNET]: KaiaImg,
  [NETWORK_CHAIN_ID.KAIA_KAIROS_TESTNET]: KaiaImg,
  [NETWORK_CHAIN_ID.SONEIUM_MAINNET]: ethImg,
  [NETWORK_CHAIN_ID.SONEIUM_MINATO_TESTNET]: ethImg,
  [NETWORK_CHAIN_ID.XRPLEVM_TESTNET]: XrpLevmImg,
  [NETWORK_CHAIN_ID.SOPHON]: SophonImg,
  [NETWORK_CHAIN_ID.SOPHON_TESTNET]: SophonTestnetImg,
  [NETWORK_CHAIN_ID.CREDITCOIN]: CreditcoinImg,
};
