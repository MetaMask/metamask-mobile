/**
 * Centralized constants for Polymarket E2E testing.
 * Predict E2E balances are now funded with pUSD. Legacy USDC.e remains
 * available only so app code can probe the sweep path and receive zero.
 */

export const PROXY_WALLET_ADDRESS =
  '0x5f7c8f3c8bedf5e7db63a34ef2f39322ca77fe72';
export const USER_WALLET_ADDRESS = '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3';

// Mock pUSD balance (28.16 pUSD = 28,160,000 = 0x1adb5e4)
export const MOCK_PUSD_BALANCE_WEI =
  '0x0000000000000000000000000000000000000000000000000000000001adb5e4';

// Post-claim pUSD balance (48.16 pUSD = 48,160,000 = 0x2dedd00)
export const POST_CLAIM_PUSD_BALANCE_WEI =
  '0x0000000000000000000000000000000000000000000000000000000002dedd00';

export const POST_CASH_OUT_PUSD_BALANCE_WEI =
  '0x00000000000000000000000000000000000000000000000000000000037f14a0';

// Post-open-position pUSD balance (17.76 pUSD = 17,760,000 = 0x10eff00)
export const POST_OPEN_POSITION_PUSD_BALANCE_WEI =
  '0x00000000000000000000000000000000000000000000000000000000010eff00';

export const SAFE_FACTORY_ADDRESS =
  '0xaacfeea03eb1561c4e67d661e40682bd20e3541b';
export const PUSD_CONTRACT_ADDRESS =
  '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB';
export const USDC_CONTRACT_ADDRESS =
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
/** Polymarket USD (pUSD) on Polygon — predict collateral; must match app PolymarketProvider constants. */
export const POLYGON_PUSD_TOKEN_ADDRESS =
  '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb';
export const MULTICALL_CONTRACT_ADDRESS =
  '0xca11bde05977b3631167028862be2a173976ca11';
export const CONDITIONAL_TOKENS_CONTRACT_ADDRESS =
  '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';
export const POLYGON_EIP7702_CONTRACT_ADDRESS =
  '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B';

// Backward-compatible aliases while callers migrate naming.
export const MOCK_USDC_BALANCE_WEI = MOCK_PUSD_BALANCE_WEI;
export const POST_CLAIM_USDC_BALANCE_WEI = POST_CLAIM_PUSD_BALANCE_WEI;
export const POST_CASH_OUT_USDC_BALANCE_WEI = POST_CASH_OUT_PUSD_BALANCE_WEI;
export const POST_OPEN_POSITION_USDC_BALANCE_WEI =
  POST_OPEN_POSITION_PUSD_BALANCE_WEI;

// EIP-7702 format: 0xef01 (magic byte) + 00 (padding) + 20-byte contract address
// This format indicates an EOA is upgraded with EIP-7702
export const EIP7702_CODE_FORMAT = (contractAddress: string): string => {
  const addressWithoutPrefix = contractAddress.toLowerCase().replace('0x', '');
  // EIP-7702 format: ef01 (magic byte) + 00 (padding byte) + 20-byte address (40 hex chars)
  return `0xef0100${addressWithoutPrefix}`;
};
