/**
 * mUSD Conversion Constants for Earn namespace
 */

import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';

export const MUSD_TOKEN_MAINNET = {
  address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  symbol: 'MUSD',
  name: 'MUSD',
  decimals: 6,
  chainId: CHAIN_IDS.MAINNET,
} as const;

export const MUSD_CURRENCY = 'MUSD';

// mUSD token address on Ethereum mainnet (6 decimals)
export const MUSD_ADDRESS_ETHEREUM =
  '0xaca92e438df0b2401ff60da7e4337b687a2435da';

// Ethereum mainnet chain ID
export const ETHEREUM_MAINNET_CHAIN_ID = '0x1';

export const STABLECOIN_SYMBOL_TO_ADDRESS_BY_CHAIN: Record<
  Hex,
  Record<string, Hex>
> = {
  [NETWORKS_CHAIN_ID.MAINNET]: {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
  // Temp: Uncomment once we support Linea -> Linea quotes
  // [NETWORKS_CHAIN_ID.LINEA_MAINNET]: {
  //   USDC: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
  //   USDT: '0xa219439258ca9da29e9cc4ce5596924745e12b93',
  // },
  // [NETWORKS_CHAIN_ID.BSC]: {
  //   USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  //   USDT: '0x55d398326f99059ff775485246999027b3197955',
  // },
};

export const CONVERTIBLE_STABLECOINS_BY_CHAIN: Record<Hex, Hex[]> = (() => {
  const result: Record<Hex, Hex[]> = {};
  for (const [chainId, symbolMap] of Object.entries(
    STABLECOIN_SYMBOL_TO_ADDRESS_BY_CHAIN,
  )) {
    result[chainId as Hex] = Object.values(symbolMap);
  }
  return result;
})();

// TODO: Remove this once we add to TransactionType. Requires updating transaction-controller package.
// Similar to a swap except that output token is predetermined (e.g. mUSD) and the user cannot change it.
export const MUSD_CONVERSION_TRANSACTION_TYPE =
  'mUSDConversion' as TransactionType;
