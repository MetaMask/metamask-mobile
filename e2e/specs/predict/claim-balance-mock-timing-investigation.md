# Claim Balance Mock Timing Investigation

## Problem

When setting up `POLYMARKET_POST_ClA_OUT_MOCKS` to update the USDC balance after a claim transaction, the timing of when the mock is set up is critical for the test to pass.

## Finding

**Calling the mock AFTER the transaction (after `device.enableSynchronization()`) works correctly, but calling it BEFORE does not.**

## Why This Happens

### Balance Refresh Flow

The balance refresh after a claim transaction follows this asynchronous flow:

1. **Transaction Confirmation**: When the user taps the claim confirm button, the transaction is submitted
2. **Transaction Controller Status Update**: The `TransactionController` updates the transaction status from `pending` → `approved` → `confirmed`
3. **Subscription Handler Fires**: `usePredictToasts` subscribes to `TransactionController:transactionStatusUpdated` events
4. **onConfirmed Callback Executes**: When status becomes `confirmed`, the subscription handler calls `onConfirmed?.()` (see `app/components/UI/Predict/hooks/usePredictToasts.tsx:198`)
5. **Balance Refresh Triggered**: `usePredictClaimToasts.onConfirmed` calls `loadBalance({ isRefresh: true })` (see `app/components/UI/Predict/hooks/usePredictClaimToasts.tsx:83`)

### Code Flow

```typescript
// usePredictToasts.tsx:194-198
} else if (transactionMeta.status === TransactionStatus.confirmed) {
  clearTransaction?.();
  const amount = confirmedToastConfig.getAmount(transactionMeta);
  showConfirmedToast(amount);
  onConfirmed?.(); // <-- This triggers the balance refresh
}
```

```typescript
// usePredictClaimToasts.tsx:79-86
onConfirmed: () => {
  loadPositions({ isRefresh: true }).catch(() => {
    // Ignore errors when refreshing positions
  });
  loadBalance({ isRefresh: true }).catch(() => {  // <-- Balance refresh happens here
    // Ignore errors when refreshing balance
  });
},
```

### Timing Considerations

The `onConfirmed` callback execution has several asynchronous delays:

1. **Transaction Controller Processing**: Time for the transaction controller to update the status
2. **Subscription Handler Execution**: Time for the event subscription to process and call the handler
3. **React State Update Processing**: Time for React to process the state update and re-render
4. **Callback Execution**: Time for the `onConfirmed` callback to execute

### Why Calling Mock AFTER Works

When `POLYMARKET_POST_ClA_OUT_MOCKS` is called **after** `device.enableSynchronization()`:

1. ✅ The transaction has been submitted and is being processed
2. ✅ `device.enableSynchronization()` ensures the UI has settled after the transaction submission
3. ✅ The mock is set up just before the `onConfirmed` callback fires
4. ✅ When `loadBalance({ isRefresh: true })` is called, the high-priority mocks are already active
5. ✅ The balance call is caught by the high-priority mock and returns the updated balance

### Why Calling Mock BEFORE Doesn't Work

When `POLYMARKET_POST_ClA_OUT_MOCKS` is called **before** the transaction:

1. ❌ The high-priority mocks intercept ALL RPC calls during transaction submission
2. ❌ This can interfere with `eth_getTransactionCount`, `eth_estimateGas`, etc.
3. ❌ Even though we filter for USDC balance calls in the matching function, there may be timing issues
4. ❌ The transaction submission might make balance calls before the transaction completes
5. ❌ The mocks might not be in the correct state when the actual refresh happens

### Test Flow Comparison

#### ❌ BEFORE (Doesn't work)

```typescript
await POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS(mockServer);
await POLYMARKET_POST_ClA_OUT_MOCKS(mockServer); // Too early!

await PredictClaimPage.tapClaimConfirmButton();
await device.enableSynchronization();
// onConfirmed callback fires here, but timing might be off
```

#### ✅ AFTER (Works)

```typescript
await POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS(mockServer);

await PredictClaimPage.tapClaimConfirmButton();
await device.enableSynchronization();
await POLYMARKET_POST_ClA_OUT_MOCKS(mockServer); // Just in time!
// onConfirmed callback fires here, mocks are ready
```

## Key Insight

**The balance refresh is triggered asynchronously via the `onConfirmed` callback, which fires some time after the transaction is confirmed. Setting up mocks too early can interfere with the transaction submission process, while setting them up after `device.enableSynchronization()` ensures they're ready exactly when needed.**

## Recommendation

Always call `POLYMARKET_POST_ClA_OUT_MOCKS` **after**:

- The transaction is submitted (`tapClaimConfirmButton()`)
- The UI has synchronized (`device.enableSynchronization()`)
- But **before** navigating or checking the balance

This ensures the mocks are active when the `onConfirmed` callback triggers the balance refresh, without interfering with the transaction submission process.

## Code Consolidation: Why It Doesn't Work

### Attempted Approach

We attempted to create a unified, reusable function for updating balances that both claim and cash-out flows could use:

```typescript
// Proposed unified function
export const POLYMARKET_POST_ClA_OUT_MOCKS = async (
  mockServer: Mockttp,
  newBalance: string, // <-- Parameterized balance
) => {
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer, newBalance);
  // Set up high-priority mocks with newBalance
};

// Wrapper for claim
export const POLYMARKET_UPDATE_CLAIM_BALANCE_MOCKS = async (
  mockServer: Mockttp,
) => {
  await POLYMARKET_POST_ClA_OUT_MOCKS(mockServer, POST_CLAIM_USDC_BALANCE_WEI);
};
```

### Why This Approach Fails

#### 1. **Duplicate Mock Setup**

When a wrapper function calls the unified function, it creates duplicate mock setups:

```typescript
// POLYMARKET_UPDATE_CLAIM_BALANCE_MOCKS calls:
await POLYMARKET_USDC_BALANCE_MOCKS(mockServer, POST_CLAIM_USDC_BALANCE_WEI); // First call

// Then POLYMARKET_POST_ClA_OUT_MOCKS calls it again:
await POLYMARKET_USDC_BALANCE_MOCKS(mockServer, newBalance); // Second call - duplicate!
```

This redundancy causes:

- Multiple base mocks (priority 999) to be registered
- Conflicting global state updates (`currentUSDCBalance` updated twice)
- Unpredictable behavior about which mock catches which request

#### 2. **Mock Priority Conflicts**

Multiple high-priority mocks (priority 1005, 1007) registered for the same patterns can cause:

- Mockttp to match requests inconsistently
- Some balance calls caught by one mock, others by a different mock
- Race conditions where the "wrong" mock (returning old balance) catches the request

#### 3. **Timing Issues with Nested Function Calls**

The extra indirection from wrapper functions adds async overhead:

```typescript
// Each async call adds a microtask delay
await POLYMARKET_UPDATE_CLAIM_BALANCE_MOCKS(mockServer);  // Step 1
  └─> await POLYMARKET_POST_ClA_OUT_MOCKS(...);           // Step 2
      └─> await POLYMARKET_USDC_BALANCE_MOCKS(...);        // Step 3
          └─> await mockServer.forPost(...);               // Step 4 (multiple times)
```

These nested async calls create a timing window where:

- The balance refresh callback might fire while mocks are still being set up
- The order of mock registration becomes unpredictable
- The `onConfirmed` callback might execute between mock setup steps

#### 4. **Global State Race Conditions**

The global `currentUSDCBalance` variable can be updated multiple times in quick succession:

```typescript
// In POLYMARKET_USDC_BALANCE_MOCKS
if (customBalance) {
  currentUSDCBalance = customBalance; // Update 1
}

// Called again from nested function
currentUSDCBalance = customBalance; // Update 2 (potential race condition)
```

Base mocks (priority 999) read `currentUSDCBalance` at different times:

- Some might read it during Update 1
- Others during Update 2
- High-priority mocks return a hardcoded value
- This creates inconsistency between what base mocks and high-priority mocks return

#### 5. **Loss of Mock Context**

Each balance update scenario (claim, cash-out) has specific requirements:

- **Claim**: Balance updates from $28.16 → $48.16
- **Cash-out**: Balance updates from $28.16 → $58.66
- Each might need different mock priorities or patterns

A unified function loses this context and tries to be "one size fits all", but the timing-sensitive nature of balance refreshes requires scenario-specific implementations.

### What Works: Separate Functions

Having **dedicated, separate functions** that are called directly:

```typescript
// Direct call - works reliably
await POLYMARKET_POST_ClA_OUT_MOCKS(mockServer);

// Separate function for claim - works reliably
await POLYMARKET_UPDATE_CLAIM_BALANCE_MOCKS(mockServer);
```

Benefits:

- ✅ Single mock setup pass (no duplication)
- ✅ No nested function call overhead
- ✅ Clear, predictable mock registration order
- ✅ No race conditions with global state
- ✅ Scenario-specific optimizations possible

### Key Takeaway

**Despite code duplication, having separate, dedicated functions that are called directly works better than trying to create a unified abstraction.** The timing-sensitive nature of balance refresh mocks requires:

1. **Single-pass mock setup** - no nested function calls
2. **Immediate availability** - mocks ready exactly when needed
3. **Predictable state** - global variables updated once, at the right time
4. **Scenario-specific control** - each flow can optimize its mock setup

Attempts to DRY (Don't Repeat Yourself) this code introduce timing issues, race conditions, and unpredictable behavior that outweigh the benefits of code reuse.
