import { CHAIN_IDS } from '@metamask/transaction-controller';

/**
 * mUSD token constants for conversion confirmation flow
 */
// TODO: If keeping this constant, rename to MUSD_TOKEN_ETHEREUM
export const MUSD_TOKEN = {
  address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  symbol: 'mUSD',
  name: 'mUSD',
  decimals: 6,
  chainId: CHAIN_IDS.MAINNET,
};

export const MUSD_CURRENCY = 'mUSD';
