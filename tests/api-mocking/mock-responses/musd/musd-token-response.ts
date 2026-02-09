/**
 * Token API mock response for mUSD (token metadata).
 */

import { MUSD_MAINNET } from '../../../constants/musd-mainnet.ts';

export const MUSD_TOKEN_API_RESPONSE = {
  address: MUSD_MAINNET,
  symbol: 'MUSD',
  name: 'MetaMask USD',
  decimals: 6,
  chainId: 1,
  logoURI: '',
  aggregators: [],
};
