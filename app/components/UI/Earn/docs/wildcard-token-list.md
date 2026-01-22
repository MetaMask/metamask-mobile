# Wildcard Token List Architecture

This document describes the architecture for filtering tokens using allowlists and blocklists with wildcard support.

## Overview

The Wildcard Token List system provides a flexible way to control which tokens are permitted for specific operations (e.g., mUSD conversion). It supports:

- **Allowlists**: Explicitly permit specific tokens
- **Blocklists**: Explicitly forbid specific tokens (override)
- **Wildcards**: Apply rules across all chains or all tokens

## Core Types

### `WildcardTokenList`

A mapping of chain IDs (or `"*"`) to arrays of token symbols (or `["*"]`):

```typescript
type WildcardTokenList = Record<string, string[]>;
```

## Wildcard Patterns

### Chain-Level Wildcards

| Pattern                       | Meaning                                            |
| ----------------------------- | -------------------------------------------------- |
| `{ "*": ["USDC"] }`           | USDC is matched on **all chains**                  |
| `{ "0x1": ["USDC", "USDT"] }` | USDC and USDT are matched only on Ethereum mainnet |

### Token-Level Wildcards

| Pattern            | Meaning                                        |
| ------------------ | ---------------------------------------------- |
| `{ "0x1": ["*"] }` | **All tokens** are matched on Ethereum mainnet |
| `{ "*": ["*"] }`   | **All tokens** on **all chains** are matched   |

### Combined Examples

```typescript
// Allow USDC on all chains, plus all tokens on Linea
const allowlist: WildcardTokenList = {
  '*': ['USDC'],
  '0xe708': ['*'],
};

// Block tokens globally or on specific chains
const blocklist: WildcardTokenList = {
  '*': ['SCAM_TOKEN'], // Blocked on all chains
  '0x1': ['DEPRECATED_TOKEN'], // Blocked only on Ethereum mainnet
};
```

## Filtering Logic

The `isTokenAllowed` function implements a two-step filtering process:

```
┌─────────────────────────────────────────────────────────────┐
│                    isTokenAllowed()                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Allowlist Check (if non-empty)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Token must be IN the allowlist to proceed           │    │
│  │ If not in allowlist → BLOCKED                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                  │
│  Step 2: Blocklist Check (if non-empty)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Token must NOT be in the blocklist                  │    │
│  │ If in blocklist → BLOCKED                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                  │
│  Result: Token is ALLOWED                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Behaviors

| Allowlist   | Blocklist   | Token In Allowlist | Token In Blocklist | Result     |
| ----------- | ----------- | ------------------ | ------------------ | ---------- |
| Empty `{}`  | Empty `{}`  | N/A                | N/A                | ✅ Allowed |
| Has entries | Empty `{}`  | ✅ Yes             | N/A                | ✅ Allowed |
| Has entries | Empty `{}`  | ❌ No              | N/A                | ❌ Blocked |
| Empty `{}`  | Has entries | N/A                | ❌ No              | ✅ Allowed |
| Empty `{}`  | Has entries | N/A                | ✅ Yes             | ❌ Blocked |
| Has entries | Has entries | ✅ Yes             | ❌ No              | ✅ Allowed |
| Has entries | Has entries | ✅ Yes             | ✅ Yes             | ❌ Blocked |
| Has entries | Has entries | ❌ No              | N/A                | ❌ Blocked |

## Configuration Sources

Configuration is loaded with the following priority:

1. **Remote Feature Flags** (highest priority)
2. **Local Environment Variables** (fallback)
3. **Empty object `{}`** (default - allows all if no blocklist)

### Remote Feature Flags

```typescript
// Allowlist
remoteFeatureFlags.earnMusdConvertibleTokensAllowlist;

// Blocklist
remoteFeatureFlags.earnMusdConvertibleTokensBlocklist;
```

### Environment Variables

```bash
# Allowlist
MM_MUSD_CONVERTIBLE_TOKENS_ALLOWLIST='{"0x1":["USDC","USDT","DAI"],"0xe708":["USDC","USDT"]}'

# Blocklist
MM_MUSD_CONVERTIBLE_TOKENS_BLOCKLIST='{"*":["BLOCKED_TOKEN"]}'
```

## Use Cases

### 1. Allow Only Specific Tokens

```typescript
// Only allow USDC, USDT, DAI on Ethereum and USDC, USDT on Linea
const allowlist = {
  '0x1': ['USDC', 'USDT', 'DAI'],
  '0xe708': ['USDC', 'USDT'],
};
const blocklist = {}; // Empty - no overrides
```

### 2. Allow All Tokens Except Specific Ones

```typescript
const allowlist = {}; // Empty - allows all by default
const blocklist = {
  '*': ['SCAM_TOKEN', 'DEPRECATED_TOKEN'],
};
```

### 3. Allow All Tokens on Specific Chains

```typescript
const allowlist = {
  '0x1': ['*'], // All tokens on Ethereum
  '0xe708': ['*'], // All tokens on Linea
};
const blocklist = {};
```

### 4. Emergency Kill Switch

The blocklist can serve as an emergency override to quickly disable specific tokens without changing the allowlist:

```typescript
// Existing allowlist
const allowlist = {
  '0x1': ['USDC', 'USDT', 'DAI'],
};

// Emergency: block USDT due to an issue
const blocklist = {
  '*': ['USDT'],
};
// Result: Only USDC and DAI are allowed
```

## API Reference

### `isTokenInWildcardList`

Checks if a token matches any entry in a wildcard token list.

```typescript
function isTokenInWildcardList(
  tokenSymbol: string,
  tokenList: WildcardTokenList,
  chainId?: string,
): boolean;
```

### `isTokenAllowed`

Combines allowlist and blocklist logic to determine if a token is permitted.

```typescript
function isTokenAllowed(
  tokenSymbol: string,
  allowlist?: WildcardTokenList,
  blocklist?: WildcardTokenList,
  chainId?: string,
): boolean;
```

### `isValidWildcardTokenList`

Validates that an object conforms to the `WildcardTokenList` structure.

```typescript
function isValidWildcardTokenList(obj: unknown): obj is WildcardTokenList;
```

## File Locations

| File                                                      | Description                        |
| --------------------------------------------------------- | ---------------------------------- |
| `app/components/UI/Earn/utils/wildcardTokenList.ts`       | Core utility functions             |
| `app/components/UI/Earn/selectors/featureFlags/index.ts`  | Redux selectors for fetching lists |
| `app/components/UI/Earn/hooks/useMusdConversionTokens.ts` | Hook using the filtering logic     |

## Symbol Matching

- Token symbols are matched **case-insensitively**
- Example: `"usdc"`, `"USDC"`, and `"Usdc"` all match

## Notes

- An **empty allowlist** (`{}`) means "allow all tokens" (no restrictions)
- An **empty blocklist** (`{}`) means "block nothing" (no overrides)
- The **blocklist always takes precedence** over the allowlist
- Chain IDs should be in hex format (e.g., `"0x1"` for Ethereum mainnet)
