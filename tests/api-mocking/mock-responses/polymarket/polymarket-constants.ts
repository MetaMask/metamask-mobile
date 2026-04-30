/**
 * Centralized constants for Polymarket E2E testing
 * Contains all wallet addresses, contract addresses, and mock values
 */

// Use the correct proxy wallet address for consistency across all tests
export const PROXY_WALLET_ADDRESS =
  '0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72';
// Use the default fixture account address for consistency with tests
export const USER_WALLET_ADDRESS = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';

// Mock USDC balance (28.16 USDC = 28,160,000 = 0x1adb5e4)
export const MOCK_USDC_BALANCE_WEI =
  '0x0000000000000000000000000000000000000000000000000000000001adb5e4'; // 28160000 in hex

// Post-claim USDC balance (48.16 USDC = 48,160,000 = 0x2dedd00)
export const POST_CLAIM_USDC_BALANCE_WEI =
  '0x0000000000000000000000000000000000000000000000000000000002dedd00';

export const POST_CASH_OUT_USDC_BALANCE_WEI =
  '0x00000000000000000000000000000000000000000000000000000000037f14a0'; // 58.66 USDC

// Post-open-position USDC balance (17.76 USDC = 17,760,000 = 0x10eff00)
// Base balance (28.16) - investment (10.00) - fees (~0.40) = 17.76 USDC
export const POST_OPEN_POSITION_USDC_BALANCE_WEI =
  '0x00000000000000000000000000000000000000000000000000000000010eff00'; // 17,760,000 in hex
// Mock contract addresses
export const SAFE_FACTORY_ADDRESS =
  '0xaacfeea03eb1561c4e67d661e40682bd20e3541b';
export const USDC_CONTRACT_ADDRESS =
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
export const MULTICALL_CONTRACT_ADDRESS =
  '0xca11bde05977b3631167028862be2a173976ca11';
export const CONDITIONAL_TOKENS_CONTRACT_ADDRESS =
  '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';
export const POLYGON_EIP7702_CONTRACT_ADDRESS =
  '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B';

// EIP-7702 format: 0xef01 (magic byte) + 00 (padding) + 20-byte contract address
// This format indicates an EOA is upgraded with EIP-7702
export const EIP7702_CODE_FORMAT = (contractAddress: string): string => {
  const addressWithoutPrefix = contractAddress.toLowerCase().replace('0x', '');
  // EIP-7702 format: ef01 (magic byte) + 00 (padding byte) + 20-byte address (40 hex chars)
  return `0xef0100${addressWithoutPrefix}`;
};
