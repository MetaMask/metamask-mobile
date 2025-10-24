/**
 * Centralized constants for Polymarket E2E testing
 * Contains all wallet addresses, contract addresses, and mock values
 */

// Use the correct proxy wallet address for consistency across all tests
export const PROXY_WALLET_ADDRESS =
  '0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72';
// Use the default fixture account address for consistency with tests
export const USER_WALLET_ADDRESS = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';
// Mock USDC balance (100 USDC = 100 * 10^6 = 100000000)
export const MOCK_USDC_BALANCE_WEI =
  '0x0000000000000000000000000000000000000000000000000000000001adb5e4'; // 100000000 in hex

// Mock contract addresses
export const SAFE_FACTORY_ADDRESS =
  '0xaacfeea03eb1561c4e67d661e40682bd20e3541b';
export const USDC_CONTRACT_ADDRESS =
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
export const MULTICALL_CONTRACT_ADDRESS =
  '0xca11bde05977b3631167028862be2a173976ca11';
export const CONDITIONAL_TOKENS_CONTRACT_ADDRESS =
  '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';
