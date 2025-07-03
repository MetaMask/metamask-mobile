# Fix for Solana Swap Duplicate Token Bug

## Issue Description
[Bug Report](https://github.com/MetaMask/metamask-mobile/issues/16195)

Users were seeing duplicate USDC tokens in the Solana swap token list when they had already imported USDC into their wallet. The issue was that both "USDC" and "USD Coin" (or similar variations) would appear as separate entries in the token selection list.

## Root Cause Analysis

The problem was in the `combineTokens` function in `app/reducers/swaps/index.js`. This function is responsible for deduplicating tokens from multiple sources (SwapsController tokens and user-imported tokens).

The issue was in the `processToken` function:

```javascript
// OLD CODE - PROBLEMATIC
function processToken(token) {
  if (!token) return null;
  const { hasBalanceError, image, ...tokenData } = token;
  return {
    occurrences: 0,
    ...tokenData,
    decimals: Number(tokenData.decimals),
    address: tokenData.address.toLowerCase(), // ❌ This was the problem!
  };
}
```

The function was blindly converting ALL token addresses to lowercase for deduplication purposes. However, **Solana addresses are case-sensitive** and should not be normalized to lowercase, while EVM addresses should be normalized for proper comparison.

## Solution Implemented

Modified the `processToken` function to handle Solana and EVM addresses differently:

```javascript
// NEW CODE - FIXED
function processToken(token) {
  if (!token) return null;
  const { hasBalanceError, image, ...tokenData } = token;
  
  // For Solana tokens, preserve case-sensitive addresses
  // For EVM tokens, normalize to lowercase for consistent comparison
  const normalizedAddress = token.chainId && isSolanaChainId(token.chainId)
    ? tokenData.address
    : tokenData.address.toLowerCase();

  return {
    occurrences: 0,
    ...tokenData,
    decimals: Number(tokenData.decimals),
    address: normalizedAddress,
  };
}
```

## Key Changes

1. **Added import**: `import { isSolanaChainId } from '@metamask/bridge-controller';`

2. **Updated processToken function**: Now checks if the token's chainId is a Solana chain using `isSolanaChainId()`:
   - If it's a Solana token: Preserves the original case-sensitive address
   - If it's an EVM token (or no chainId): Normalizes to lowercase as before

3. **Exported combineTokens function**: Made it available for testing

4. **Added comprehensive tests**: Added test cases to verify:
   - Solana tokens with identical addresses are properly deduplicated
   - EVM tokens with different case addresses are properly deduplicated  
   - Mixed Solana and EVM tokens are handled correctly
   - Edge cases (missing chainId, null tokens) are handled gracefully

## Example Solana USDC Token

The default Solana USDC token that was causing duplicates:
```javascript
{
  address: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  symbol: "USDC",
  decimals: 6,
  chainId: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
}
```

## Testing

Added comprehensive test suite in `app/reducers/swaps/swaps.test.ts` that covers:

1. **Solana token deduplication**: Verifies identical Solana tokens are deduplicated while preserving case-sensitive addresses
2. **EVM token deduplication**: Verifies EVM tokens with different casing are properly deduplicated  
3. **Mixed token handling**: Tests both Solana and EVM tokens together
4. **Edge case handling**: Tests tokens without chainId and null/undefined tokens

## Result

With this fix:
- ✅ Duplicate Solana USDC tokens will no longer appear in the swap token list
- ✅ EVM token deduplication continues to work as before
- ✅ Solana address case-sensitivity is preserved
- ✅ Backward compatibility is maintained

## Files Modified

1. `app/reducers/swaps/index.js` - Main fix implementation
2. `app/reducers/swaps/swaps.test.ts` - Added comprehensive tests

The fix is minimal, targeted, and maintains backward compatibility while properly addressing the Solana-specific address handling requirements.