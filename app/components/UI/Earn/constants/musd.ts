/**
 * mUSD Conversion Constants for Earn namespace
 */

import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { NETWORKS_CHAIN_ID } from '../../../../constants/network';
import MusdIcon from '../../../../images/musd-icon-2x.png';

export const MUSD_TOKEN = {
  symbol: 'MUSD',
  name: 'MUSD',
  decimals: 6,
  imageSource: MusdIcon,
} as const;

export const MUSD_CONVERSION_DEFAULT_CHAIN_ID = CHAIN_IDS.MAINNET;

export const MUSD_TOKEN_ADDRESS_BY_CHAIN: Record<Hex, Hex> = {
  [CHAIN_IDS.MAINNET]: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  [CHAIN_IDS.LINEA_MAINNET]: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  [CHAIN_IDS.BSC]: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
};

export const MUSD_TOKEN_ASSET_ID_BY_CHAIN: Record<Hex, string> = {
  [CHAIN_IDS.MAINNET]:
    'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  [CHAIN_IDS.LINEA_MAINNET]:
    'eip155:59144/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  [CHAIN_IDS.BSC]: 'eip155:56/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
};

export const MUSD_CURRENCY = 'MUSD';

// All stablecoins that are supported in the mUSD conversion flow.
export const MUSD_CONVERSION_STABLECOINS_BY_CHAIN_ID: Record<
  Hex,
  Record<string, Hex>
> = {
  [NETWORKS_CHAIN_ID.MAINNET]: {
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
  },
  // Temp: Uncomment once we support Linea -> Linea quotes
  [NETWORKS_CHAIN_ID.LINEA_MAINNET]: {
    USDC: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    USDT: '0xa219439258ca9da29e9cc4ce5596924745e12b93',
  },
  [NETWORKS_CHAIN_ID.BSC]: {
    USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    USDT: '0x55d398326f99059ff775485246999027b3197955',
  },
};

export const CONVERTIBLE_STABLECOINS_BY_CHAIN: Record<Hex, Hex[]> = (() => {
  const result: Record<Hex, Hex[]> = {};
  for (const [chainId, symbolMap] of Object.entries(
    MUSD_CONVERSION_STABLECOINS_BY_CHAIN_ID,
  )) {
    result[chainId as Hex] = Object.values(symbolMap);
  }
  return result;
})();
