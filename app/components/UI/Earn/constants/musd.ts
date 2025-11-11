/**
 * mUSD Conversion Constants for Earn namespace
 */

// mUSD token address on Ethereum mainnet (6 decimals)
export const MUSD_ADDRESS_ETHEREUM =
  '0xacA92E438df0B2401fF60dA7E4337B687a2435DA';

// Ethereum mainnet chain ID
export const ETHEREUM_MAINNET_CHAIN_ID = '0x1';

// Stablecoins eligible for mUSD conversion on Ethereum mainnet
export const MUSD_CONVERTIBLE_STABLECOINS_ETHEREUM = [
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
];

// USDC token address on Ethereum mainnet (6 decimals)
export const USDC_ADDRESS_ETHEREUM = MUSD_CONVERTIBLE_STABLECOINS_ETHEREUM[0];
