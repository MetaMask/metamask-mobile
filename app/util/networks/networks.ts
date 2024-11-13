import { CHAIN_IDS } from '@metamask/transaction-controller';
import { HexString } from '../../components/UI/Tokens/types';

export const NETWORK_CHAIN_ID: Record<string, HexString> = {
  FLARE_MAINNET: '0xe',
  SONGBIRD_TESTNET: '0x13',
  APE_CHAIN_TESTNET: '0x8157',
  APE_CHAIN_MAINNET: '0x8173',
  GRAVITY_ALPHA_MAINNET: '0x659',
  ...CHAIN_IDS,
};

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
export const CHAIN_ID_TOKEN_IMAGE_MAP: Record<HexString, string> = {
  [NETWORK_CHAIN_ID.FLARE_MAINNET]: require('../../images/flare-mainnet.png'),
  [NETWORK_CHAIN_ID.SONGBIRD_TESTNET]: require('../../images/songbird.png'),
  [NETWORK_CHAIN_ID.APE_CHAIN_TESTNET]: require('../../images/ape-network.png'),
  [NETWORK_CHAIN_ID.APE_CHAIN_MAINNET]: require('../../images/ape-network.png'),
  [NETWORK_CHAIN_ID.GRAVITY_ALPHA_MAINNET]: require('../../images/gravity.png'),
};
