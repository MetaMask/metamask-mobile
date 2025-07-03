# Fix for Solana Swap Token Duplication Issue

## Issue Summary
**GitHub Issue**: [#16195 - Solana - Swap - Repeated asset in the token list with imported token](https://github.com/MetaMask/metamask-mobile/issues/16195)

**Problem**: When performing a swap on Solana network, users see duplicate USDC tokens in the token selection list when they already have USDC imported in their wallet. This happens because the token deduplication logic incorrectly normalizes Solana addresses to lowercase, but Solana addresses are case-sensitive.

## Root Cause
The `processToken` function in `app/reducers/swaps/index.js` was always converting token addresses to lowercase for deduplication purposes:

```javascript
function processToken(token) {
  if (!token) return null;
  const { hasBalanceError, image, ...tokenData } = token;
  return {
    occurrences: 0,
    ...tokenData,
    decimals: Number(tokenData.decimals),
    address: tokenData.address.toLowerCase(), // ❌ This breaks Solana address matching
  };
}
```

This caused issues because:
1. **Solana addresses are case-sensitive** (unlike EVM addresses which are case-insensitive)
2. The same token from different sources (swap API vs user wallet) could have different casing
3. The deduplication logic couldn't properly match these tokens due to case differences

## Solution Implemented

### 1. Enhanced Token Address Normalization (`app/reducers/swaps/index.js`)

Added a new `normalizeTokenAddress` function that handles address normalization based on chain type:

```javascript
/**
 * Normalizes token address based on chain type
 * @param {string} address - Token address
 * @param {string} chainId - Chain ID
 * @returns {string} Normalized address
 */
function normalizeTokenAddress(address, chainId) {
  // Solana addresses are case-sensitive, so preserve original case
  if (chainId && isSolanaChainId(chainId)) {
    return address;
  }
  // EVM addresses are case-insensitive, so normalize to lowercase
  return address.toLowerCase();
}
```

Updated the `processToken` function to use this new normalization:

```javascript
function processToken(token) {
  if (!token) return null;
  const { hasBalanceError, image, ...tokenData } = token;
  return {
    occurrences: 0,
    ...tokenData,
    decimals: Number(tokenData.decimals),
    address: normalizeTokenAddress(tokenData.address, tokenData.chainId), // ✅ Now respects Solana case sensitivity
  };
}
```

### 2. Fixed Balance Address Normalization

Updated the `swapsTokensWithBalanceSelector` to use the same normalization logic for balance addresses:

```javascript
const tokensAddressesWithBalance = Object.entries(balances)
  .filter(([, balance]) => balance !== 0)
  .sort(([, balanceA], [, balanceB]) => (lte(balanceB, balanceA) ? -1 : 1))
  .map(([address]) => normalizeTokenAddress(address, chainId)); // ✅ Consistent normalization
```

### 3. Enhanced Token Selection Modal (`app/components/UI/Swaps/components/TokenSelectModal.js`)

Updated the `TokenSelectModal` component to handle address comparisons correctly for both EVM and Solana chains:

- Added the same `normalizeTokenAddress` helper function
- Updated all address comparison logic to use chain-aware normalization
- Modified exclusion filtering, token filtering, and search functionality

## Files Modified

1. **`app/reducers/swaps/index.js`**
   - Added `isSolanaChainId` import
   - Added `normalizeTokenAddress` function
   - Updated `processToken` function
   - Fixed `swapsTokensWithBalanceSelector`

2. **`app/components/UI/Swaps/components/TokenSelectModal.js`**
   - Added `isSolanaChainId` import
   - Added `normalizeTokenAddress` function
   - Updated all token address comparison logic

## Expected Result

After this fix:
- ✅ Solana tokens will no longer appear duplicated in the swap token list
- ✅ Token deduplication works correctly for both EVM and Solana chains
- ✅ Maintains backward compatibility with existing EVM swap functionality
- ✅ Preserves Solana address case sensitivity throughout the token handling pipeline

## Testing Recommendations

To verify the fix:
1. Import USDC token on Solana mainnet
2. Navigate to Swap functionality
3. Select SOL as source token
4. Click to select destination token
5. Verify only one USDC entry appears in the token list

The fix ensures that the same token from different sources (SwapsController API vs user's imported tokens) will be properly deduplicated regardless of their original address casing, while respecting the case-sensitivity requirements of each blockchain.