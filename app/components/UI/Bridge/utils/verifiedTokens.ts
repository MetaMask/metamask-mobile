import { Hex, CaipChainId } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

/**
 * A hardcoded list of verified token addresses by chainId.
 * These tokens will display a verified badge in the UI.
 */
const VERIFIED_TOKENS: Record<string, Set<string>> = {
  // Ethereum Mainnet
  [CHAIN_IDS.MAINNET]: new Set(
    [
      '0xaca92e438df0b2401ff60da7e4337b687a2435da', // mUSD (MetaMask USD)
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
      '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
      '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
      '0x6982508145454ce325ddbe47a25d4ec3d2311933', // PEPE
      '0x3845badade8e6dff049820680d1f14bd3903a5d0', // SAND
      '0x0000000000000000000000000000000000000000', // ETH (native)
    ].map((addr) => addr.toLowerCase()),
  ),

  // Optimism
  [CHAIN_IDS.OPTIMISM]: new Set(
    [
      '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // USDC
      '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // USDT
      '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
      '0x4200000000000000000000000000000000000006', // WETH
      '0x0000000000000000000000000000000000000000', // ETH (native)
    ].map((addr) => addr.toLowerCase()),
  ),

  // Polygon
  [CHAIN_IDS.POLYGON]: new Set(
    [
      '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC (Legacy)
      '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // USDC
      '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
      '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
      '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // WETH
      '0x0000000000000000000000000000000000000000', // MATIC (native)
    ].map((addr) => addr.toLowerCase()),
  ),

  // Arbitrum
  [CHAIN_IDS.ARBITRUM]: new Set(
    [
      '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
      '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // USDC.e (Bridged)
      '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT
      '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
      '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
      '0x0000000000000000000000000000000000000000', // ETH (native)
    ].map((addr) => addr.toLowerCase()),
  ),

  // Base
  [CHAIN_IDS.BASE]: new Set(
    [
      '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
      '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca', // USDbC (USD Base Coin)
      '0x4200000000000000000000000000000000000006', // WETH
      '0x0000000000000000000000000000000000000000', // ETH (native)
    ].map((addr) => addr.toLowerCase()),
  ),

  // Linea
  [CHAIN_IDS.LINEA_MAINNET]: new Set(
    [
      '0xaca92e438df0b2401ff60da7e4337b687a2435da', // mUSD (MetaMask USD)
      '0x176211869ca2b568f2a7d4ee941e073a821ee1ff', // USDC
      '0xa219439258ca9da29e9cc4ce5596924745e12b93', // USDT
      '0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f', // WETH
      '0x0000000000000000000000000000000000000000', // ETH (native)
    ].map((addr) => addr.toLowerCase()),
  ),

  // BSC
  [CHAIN_IDS.BSC]: new Set(
    [
      '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // USDC
      '0x55d398326f99059ff775485246999027b3197955', // USDT
      '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', // DAI
      '0x2170ed0880ac9a755fd29b2688956bd959f933f8', // ETH
      '0x0000000000000000000000000000000000000000', // BNB (native)
    ].map((addr) => addr.toLowerCase()),
  ),

  // Avalanche
  [CHAIN_IDS.AVALANCHE]: new Set(
    [
      '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', // USDC
      '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', // USDT
      '0xd586e7f844cea2f87f50152665bcbc2c279d8d70', // DAI
      '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab', // WETH.e
      '0x0000000000000000000000000000000000000000', // AVAX (native)
    ].map((addr) => addr.toLowerCase()),
  ),

  // Solana (using CAIP format)
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': new Set([
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    'So11111111111111111111111111111111111111112', // SOL (wrapped)
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501', // SOL (native)
  ]),
};

/**
 * Checks if a token is verified based on its address and chainId
 * @param address - The token contract address
 * @param chainId - The chain ID (hex or CAIP format)
 * @returns true if the token is verified, false otherwise
 */
export const isTokenVerified = (
  address: string,
  chainId: Hex | CaipChainId,
): boolean => {
  if (!address || !chainId) return false;

  const normalizedChainId = chainId.toString();
  const normalizedAddress = address.toLowerCase();

  return VERIFIED_TOKENS[normalizedChainId]?.has(normalizedAddress) ?? false;
};

/**
 * Gets all verified token addresses for a specific chain
 * @param chainId - The chain ID (hex or CAIP format)
 * @returns Array of verified token addresses for the chain
 */
export const getVerifiedTokensForChain = (
  chainId: Hex | CaipChainId,
): string[] => {
  const normalizedChainId = chainId.toString();
  const verifiedSet = VERIFIED_TOKENS[normalizedChainId];

  return verifiedSet ? Array.from(verifiedSet) : [];
};
