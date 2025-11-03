# Balance Mock Improvements Brainstorm

## Critical Discovery

### The Root Problem

**We're setting up base mocks TWICE:**

1. **Test Setup** (line 48): `POLYMARKET_COMPLETE_MOCKS` → calls `POLYMARKET_USDC_BALANCE_MOCKS(mockServer)`
   - Sets up base mocks (priority 999) with default balance
   - Base mocks reference `currentUSDCBalance` variable

2. **Balance Update** (line 89): `POLYMARKET_POST_ClA_OUT_MOCKS` → calls `POLYMARKET_USDC_BALANCE_MOCKS(mockServer, POST_CLAIM_USDC_BALANCE_WEI)`
   - Sets up base mocks AGAIN (duplicate!)
   - Also updates `currentUSDCBalance` variable

**The Problem**: Base mocks are already set up and reference `currentUSDCBalance`. We just need to update the variable - we don't need to set up the mocks again!

**Current Flow**:

```typescript
// Setup (line 48)
POLYMARKET_COMPLETE_MOCKS(mockServer)
  └─> POLYMARKET_USDC_BALANCE_MOCKS(mockServer) // Sets up base mocks (999) + currentUSDCBalance = default

// Later, updating balance (line 89)
POLYMARKET_POST_ClA_OUT_MOCKS(mockServer)
  └─> POLYMARKET_USDC_BALANCE_MOCKS(mockServer, POST_CLAIM_USDC_BALANCE_WEI) // Sets up base mocks AGAIN + currentUSDCBalance = new
      └─> mockServer.forPost('/proxy').asPriority(999)... // DUPLICATE!
```

**What Should Happen**:

```typescript
// Setup (line 48) - sets up base mocks ONCE
POLYMARKET_COMPLETE_MOCKS(mockServer)
  └─> POLYMARKET_USDC_BALANCE_MOCKS(mockServer) // Sets up base mocks (999) + currentUSDCBalance = default
      // Base mocks reference currentUSDCBalance in their callback:
      // result = currentUSDCBalance; // (line 577)

// Later, updating balance - just update variable, mocks already exist!
POLYMARKET_POST_ClA_OUT_MOCKS(mockServer)
  └─> currentUSDCBalance = POST_CLAIM_USDC_BALANCE_WEI // Just update variable!
      // Base mocks already exist and will use updated value automatically (they read it on each request)
      // + Set up high-priority mocks (1005, 1007) for balance refresh calls
```

**Why This Works**:

- Base mocks read `currentUSDCBalance` **on each request** (not at setup time)
- When we update `currentUSDCBalance`, all future requests to base mocks automatically use the new value
- We only need to set up base mocks ONCE during test setup
- To update balance, just change the variable and set up high-priority refresh mocks

## Current Issues

### 1. Redundant `POLYMARKET_USDC_BALANCE_MOCKS` Calls (ROOT CAUSE)

**Problem**: When updating balance for claim/cash-out, we call `POLYMARKET_USDC_BALANCE_MOCKS` which:

- Updates `currentUSDCBalance` global variable ✅ (needed)
- Sets up BASE mocks (priority 999) that handle all RPC calls ❓ (do we need this?)

**Question**: Do we actually need to set up base mocks if we're setting up high-priority mocks (1005, 1007) that will catch the balance refresh calls?

**Current Flow**:

```typescript
// POLYMARKET_POST_ClA_OUT_MOCKS
await POLYMARKET_USDC_BALANCE_MOCKS(mockServer, POST_CLAIM_USDC_BALANCE_WEI);
  // ↑ Updates currentUSDCBalance ✅
  // ↑ Sets up base mocks (999) that use currentUSDCBalance

// Then set up high-priority mocks (1005, 1007)
await mockServer.forPost('/proxy').asPriority(1005)... // Catches balance refresh
```

**Analysis**:

- Base mocks (999) are needed for OTHER RPC calls: `eth_getTransactionCount`, `eth_getCode`, `eth_estimateGas`, etc.
- Base mocks return `currentUSDCBalance` for USDC balance calls, but high-priority mocks (1005+) catch these FIRST
- So the base mock's balance handling is redundant IF high-priority mocks catch all balance refresh calls
- BUT: Base mocks handle non-refresh balance calls during transaction submission

### 2. Inconsistent Priority System

**Current Priorities**:

- `999` - Base mocks (catch-all for all RPC calls)
- `1000` - CLOB API, position removal overrides
- `1005` - Balance refresh mocks (claim/cash-out for `/proxy` calls)
- `1006` - Withdraw balance mocks
- `1007` - Balance refresh mocks (cash-out for `polygon-rpc.com` direct calls)
- Claim also uses `1005` for `polygon-rpc.com` - INCONSISTENT with cash-out!

**Issues**:

- No clear documentation of what each priority range means
- Same priority (1005) used for both `/proxy` and `polygon-rpc.com` in claim flow
- Priority 1007 only used for cash-out, not claim
- No clear pattern or system

## Proposed Solutions

### Solution 1: Separate Balance Update from Mock Setup

**Concept**: Create a simple function that ONLY updates the global variable, without setting up mocks.

```typescript
/**
 * Updates the global USDC balance variable without setting up mocks
 * Use this when you're going to set up high-priority mocks separately
 */
const updateUSDCBalance = (newBalance: string) => {
  currentUSDCBalance = newBalance;
};

/**
 * Sets up base mocks for RPC calls (priority 999)
 * These handle all non-balance-refresh calls
 */
const setupBaseRPC Mocks = async (mockServer: Mockttp) => {
  // Set up base mocks that use currentUSDCBalance
  // Only call this once during initial setup (POLYMARKET_COMPLETE_MOCKS)
};

/**
 * Sets up high-priority mocks for balance refresh (priority 1005-1007)
 * These catch balance refresh calls after transactions
 */
const setupBalanceRefreshMocks = async (
  mockServer: Mockttp,
  newBalance: string,
  priority: number,
) => {
  // Set up high-priority mocks with specific priority
};
```

**Benefits**:

- Clear separation: update variable vs. set up mocks
- Avoid duplicate mock setup
- More control over when mocks are registered

**Usage**:

```typescript
// Update balance
updateUSDCBalance(POST_CLAIM_USDC_BALANCE_WEI);

// Set up high-priority refresh mocks
await setupBalanceRefreshMocks(
  mockServer,
  POST_CLAIM_USDC_BALANCE_WEI,
  PRIORITY.BALANCE_REFRESH,
);
```

### Solution 2: Consistent Priority System

**Concept**: Define a clear priority system with constants and documentation.

```typescript
/**
 * Mock Priority System
 * Higher numbers = checked first
 *
 * 999  - Base mocks (catch-all for all RPC calls, set up once in POLYMARKET_COMPLETE_MOCKS)
 * 1000 - API overrides (position removal, CLOB API)
 * 1005 - Balance refresh mocks for /proxy calls (claim, cash-out, withdraw)
 * 1006 - Balance refresh mocks for withdraw flow (separate to avoid conflicts)
 * 1007 - Balance refresh mocks for direct polygon-rpc.com calls (claim, cash-out)
 */
const PRIORITY = {
  BASE: 999,
  API_OVERRIDE: 1000,
  BALANCE_REFRESH_PROXY: 1005,
  BALANCE_REFRESH_WITHDRAW: 1006,
  BALANCE_REFRESH_DIRECT: 1007,
} as const;
```

**Benefits**:

- Clear documentation of what each priority means
- Type-safe constants prevent typos
- Easy to see the priority hierarchy
- Consistent usage across all mocks

**Usage**:

```typescript
await mockServer
  .forPost('/proxy')
  .asPriority(PRIORITY.BALANCE_REFRESH_PROXY) // Clear intent
  ...
```

### Solution 3: Do We Even Need Base Mocks Updated?

**Question**: Since high-priority mocks (1005, 1007) catch balance refresh calls, do we need to update base mocks?

**Analysis**:

- Base mocks (999) handle OTHER calls: `eth_getTransactionCount`, `eth_getCode`, etc. ✅ (needed)
- Base mocks return `currentUSDCBalance` for USDC balance calls, but high-priority mocks catch these first
- During transaction submission, the app might make balance calls that aren't "refresh" calls
- These non-refresh balance calls would hit base mocks

**Possible Approach**:

- Keep base mocks updated with `currentUSDCBalance` (for non-refresh calls)
- But don't call `POLYMARKET_USDC_BALANCE_MOCKS` - just update the variable directly
- Only set up base mocks once during initial setup

### Solution 4: Hybrid Approach

**Best of all solutions**:

```typescript
// Constants for priorities
const PRIORITY = {
  BASE: 999,
  API_OVERRIDE: 1000,
  BALANCE_REFRESH_PROXY: 1005,
  BALANCE_REFRESH_WITHDRAW: 1006,
  BALANCE_REFRESH_DIRECT: 1007,
} as const;

// Simple function to update balance (no mock setup)
const updateUSDCBalance = (newBalance: string) => {
  currentUSDCBalance = newBalance;
};

// Function to set up balance refresh mocks with consistent priorities
const setupBalanceRefreshMocks = async (
  mockServer: Mockttp,
  newBalance: string,
  options: {
    proxy?: boolean;      // Set up /proxy mock (priority 1005)
    direct?: boolean;     // Set up polygon-rpc.com mock (priority 1007)
  } = { proxy: true, direct: true },
) => {
  if (options.proxy) {
    await mockServer
      .forPost('/proxy')
      .matching(...)
      .asPriority(PRIORITY.BALANCE_REFRESH_PROXY)
      .thenCallback(() => ({ result: newBalance }));
  }

  if (options.direct) {
    await mockServer
      .forPost()
      .matching(...)
      .asPriority(PRIORITY.BALANCE_REFRESH_DIRECT)
      .thenCallback(() => ({ result: newBalance }));
  }
};

// Usage in POLYMARKET_POST_ClA_OUT_MOCKS
export const POLYMARKET_POST_ClA_OUT_MOCKS = async (mockServer: Mockttp) => {
  // Just update the balance variable (base mocks already set up during initial setup)
  updateUSDCBalance(POST_CLAIM_USDC_BALANCE_WEI);

  // Set up high-priority refresh mocks
  await setupBalanceRefreshMocks(mockServer, POST_CLAIM_USDC_BALANCE_WEI);
};
```

## The Simple Fix

**We just need to update the variable, not set up mocks again!**

Since base mocks are already set up in test setup and they read `currentUSDCBalance` on each request, we can simply:

```typescript
export const POLYMARKET_POST_ClA_OUT_MOCKS = async (mockServer: Mockttp) => {
  // Just update the global variable - base mocks already exist!
  currentUSDCBalance = POST_CLAIM_USDC_BALANCE_WEI;

  // Set up high-priority mocks for balance refresh calls only
  await setupBalanceRefreshMocks(mockServer, POST_CLAIM_USDC_BALANCE_WEI);
};
```

No need to call `POLYMARKET_USDC_BALANCE_MOCKS` again - it sets up duplicate base mocks!

## Recommended Approach

**Use Solution 4 (Hybrid)** because:

1. ✅ **Clear separation**: Update variable vs. set up mocks
2. ✅ **No duplicate mock setup**: Base mocks set up once during initial setup
3. ✅ **Consistent priorities**: Constants prevent mistakes
4. ✅ **Flexible**: Can choose which mocks to set up (proxy, direct, or both)
5. ✅ **Maintainable**: Easy to understand and modify

## Questions to Answer

1. **Do base mocks need to be updated during balance refresh?**
   - If high-priority mocks catch all balance refresh calls → NO
   - If there are non-refresh balance calls during transaction → YES (keep updated)

2. **Should we consolidate claim and cash-out to use the same priority system?**
   - YES - use 1005 for `/proxy`, 1007 for `polygon-rpc.com` consistently

3. **Can we call `POLYMARKET_USDC_BALANCE_MOCKS` multiple times safely?**
   - Currently NO - it sets up duplicate base mocks
   - Should be: called once during initial setup, then just update variable
