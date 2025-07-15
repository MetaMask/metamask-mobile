# Solana Token Population Issue in Bridge View - Debug Findings

## Problem Summary
The destination token in bridge view is not getting populated when using deep links with Solana tokens, while EVM tokens work correctly.

**Test Command:**
```bash
xcrun simctl openurl booted "https://metamask.app.link/swap?from=eip155:1/erc20:0x0000000000000000000000000000000000000000&to=solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/solana:So11111111111111111111111111111111111111112&amount=1000000000"
```

## Root Cause Analysis

### Current Deep Link Flow
1. `handleSwapUrl` receives the deep link parameters
2. `validateAndLookupToken` is called for each token parameter
3. `createTokenFromCaip` creates a basic token from CAIP-19 format
4. `fetchBridgeTokens` retrieves available bridge tokens
5. Token lookup fails for Solana tokens due to address format mismatch

### The Issue
The problem is in the `validateAndLookupToken` function in `handleSwapUrl.ts`:

**For EVM tokens:**
- `createTokenFromCaip('eip155:1/erc20:0xABC123...')` returns `{ address: '0xABC123...' }`
- Bridge token list has key: `'0xABC123...'` ✅ **Match found**

**For Solana tokens:**
- `createTokenFromCaip('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/solana:So11111111111111111111111111111111111111112')` returns `{ address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/solana:So11111111111111111111111111111111111111112' }`
- Bridge token list has key: `'So11111111111111111111111111111111111111112'` ❌ **No match found**

### Code Evidence

From `tokenUtils.ts` line 77-86:
```typescript
// For non-EVM chains (like Solana), store full CAIP format
tokenAddress = caipAssetType;
```

From `validateAndLookupToken` function:
```typescript
// 3. Find matching token (check both original and lowercase addresses)
const matchingToken =
  bridgeTokens[basicToken.address] ||
  bridgeTokens[basicToken.address.toLowerCase()];
```

The lookup fails because:
- `basicToken.address` = `'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/solana:So11111111111111111111111111111111111111112'`
- `bridgeTokens` keys = `['So11111111111111111111111111111111111111112', ...]`

## Solution

Modify the `validateAndLookupToken` function to handle Solana tokens correctly by extracting the `assetReference` from the CAIP format when performing the lookup.

### Implementation Plan

1. **Extract asset reference for Solana tokens** when looking up in bridge token list
2. **Preserve full CAIP format** for the final token object (as expected by the rest of the system)
3. **Maintain backward compatibility** with existing EVM token logic

### Code Changes Implemented

**1. Import required utility:**
```typescript
import { isCaipAssetType, Hex, parseCaipAssetType } from '@metamask/utils';
```

**2. Modified `validateAndLookupToken` function in `handleSwapUrl.ts`:**
```typescript
// 3. For Solana tokens, extract assetReference for lookup
// but preserve the full CAIP format for the final token
let lookupAddress = basicToken.address;
if (basicToken.chainId.startsWith('solana:')) {
  const parsedAsset = parseCaipAssetType(caipAssetType);
  lookupAddress = parsedAsset.assetReference;
}

// 4. Find matching token using the appropriate lookup address
const matchingToken =
  bridgeTokens[lookupAddress] ||
  bridgeTokens[lookupAddress.toLowerCase()];

// 5. Return complete token or null if not found
if (matchingToken) {
  return {
    address: basicToken.address, // Keep original address format (CAIP for Solana)
    symbol: matchingToken.symbol,
    name: matchingToken.name,
    decimals: matchingToken.decimals,
    image: matchingToken.iconUrl || matchingToken.icon || '',
    chainId: basicToken.chainId,
  };
}
```

**3. Added test case to verify the fix:**
```typescript
it('handles Solana tokens in bridge token list lookup correctly', async () => {
  // Mock Solana bridge tokens with raw addresses as keys
  mockFetchBridgeTokens.mockResolvedValue({
    'So11111111111111111111111111111111111111112': {
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      iconUrl: 'https://example.com/sol.png',
    },
  });

  const swapPath =
    'from=eip155:1/slip44:60&to=solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/solana:So11111111111111111111111111111111111111112';

  await handleSwapUrl({ swapPath });

  // Should navigate to bridge view with properly resolved Solana destination token
  expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
    screen: 'BridgeView',
    params: {
      destToken: {
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/solana:So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        image: 'https://example.com/sol.png',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      },
      // ... other params
    },
  });
});
```

## Testing Strategy

1. **Test EVM tokens** - ensure existing functionality still works
2. **Test Solana tokens** - verify destination token population works
3. **Test mixed scenarios** - EVM to Solana, Solana to EVM
4. **Test edge cases** - invalid tokens, network errors, etc.

## Files Involved

- `app/core/DeeplinkManager/Handlers/handleSwapUrl.ts` - Main fix location
- `app/components/UI/Bridge/utils/tokenUtils.ts` - Token creation logic
- `app/components/UI/Bridge/Views/BridgeView/index.tsx` - Route parameter handling
- Test files for validation

## Additional Context

The bridge system uses different address formats for different chains:
- **EVM chains**: Checksum hex addresses
- **Solana**: Full CAIP format for internal use, raw addresses for API lookups
- **Bridge token list**: Uses raw addresses as keys regardless of chain type

This inconsistency is the root cause of the lookup failure for Solana tokens.

## Fix Summary

The issue has been resolved by modifying the `validateAndLookupToken` function to:

1. **Extract the `assetReference`** from Solana CAIP format when performing bridge token list lookup
2. **Preserve the full CAIP format** in the returned token object to maintain compatibility with the rest of the system
3. **Maintain backward compatibility** with existing EVM token logic

### Before Fix:
- Lookup: `bridgeTokens['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/solana:So11111111111111111111111111111111111111112']` ❌ **Not found**

### After Fix:
- Lookup: `bridgeTokens['So11111111111111111111111111111111111111112']` ✅ **Found**
- Return: Full CAIP format preserved for compatibility

The fix ensures that Solana tokens in deep links will now properly populate the destination token in the bridge view, while maintaining all existing functionality for EVM tokens.