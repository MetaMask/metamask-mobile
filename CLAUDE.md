## Development Commands

## Git Hooks

### Pre-Commit Hook

Automatically runs on `git commit` (can be bypassed with `--no-verify`):

- Runs `prettier` and `eslint --fix` on staged files via `lint-staged`
- Location: `.husky/pre-commit`

### Pre-Push Hook

**NEW**: Validates code quality before pushing to remote (added 2025-10-17):

- Runs `eslint` on all JavaScript/TypeScript files being pushed
- Prevents unformatted code from reaching remote branches
- Catches issues that may have been committed with `--no-verify`
- Can be bypassed with `git push --no-verify` if absolutely necessary
- Location: `.husky/pre-push`

**Why this hook exists:**
The Slack thread from 2025-10-17 identified that developers using `git commit --no-verify` were introducing formatting issues into main branch, causing unrelated formatting diffs in PRs. The pre-push hook provides a safety net that respects local commit workflow while ensuring code quality before it reaches the remote repository.

### TypeScript Validation

```bash
# Full project TypeScript check (comprehensive but slower - use before final commit)
yarn lint:tsc

# Note: Isolated TypeScript checking doesn't work well due to import dependencies
# For quick iteration, rely on ESLint and your IDE's TypeScript checking
```

### ESLint Validation

```bash
# Check specific files for ESLint errors (much faster than yarn lint)
npx eslint app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx

# Fix auto-fixable issues in specific files
npx eslint app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx --fix

# Check multiple changed files at once
npx eslint file1.tsx file2.tsx file3.tsx

# Check only files changed in current branch vs main (useful for PRs)
# Portable, fast, and robust: exclude deleted files and lint only existing ones
# - Uses --diff-filter=ACMR to ignore deleted files
# - Uses NUL-delimited pipeline to handle spaces/newlines safely
# - Works across bash/zsh/dash
git diff --name-only --diff-filter=ACMR main...HEAD 2>/dev/null \
  | grep -E '\.(ts|tsx|js|jsx)$' \
  | while IFS= read -r file; do [ -f "$file" ] && printf '%s\0' "$file"; done \
  | xargs -0 -r npx eslint

# Spot-check floating promises in Perps (production code only)
npx eslint "app/components/UI/Perps/**/*.{ts,tsx}" \
  --rule "@typescript-eslint/no-floating-promises: error" \
  --ignore-pattern "**/*.test.*"

# Alternative: Check only staged files (again excluding deleted ones)
git diff --cached --name-only --diff-filter=ACMR \
  | grep -E '\.(ts|tsx|js|jsx)$' \
  | while IFS= read -r file; do [ -f "$file" ] && printf '%s\0' "$file"; done \
  | xargs -0 -r npx eslint
```

### Prettier Formatting

```bash
# Fix formatting for Perps components
npx prettier --write 'app/components/UI/Perps/**/*.{ts,tsx}'
```

### Testing

```bash
# Run specific test file
npx jest app/components/UI/Perps/hooks/usePerpsPrices.test.ts --no-coverage

# Show test failures only
npx jest app/components/UI/Perps/ --no-coverage 2>&1 | grep -A 10 "FAIL"
```

**Test Stability: Prevent Infinite Re-renders**

```typescript
// ❌ BAD: Creates new object on every render → infinite loop
const { result } = renderHook(() =>
  useHook({
    orderType: 'market', // New object reference each render!
    amount: '100',
  }),
);

// ✅ GOOD: Stable reference prevents re-renders
const params = { orderType: 'market' as const, amount: '100' };
const { result } = renderHook(() => useHook(params));
```

**Why**: Hooks with `useMemo([params])` trigger infinite re-renders when params reference changes. Extract params to stable const before `renderHook()`.

**Mock Optimization**: Use `.mockReturnValue(Promise.resolve())` instead of `.mockResolvedValue()` for synchronous promise resolution (50-60ms vs 1000ms+ per test).

## Code Comments Policy

**Maximize Signal-to-Noise Ratio**: Comments must add value beyond what the code already expresses.

### ❌ NEVER Write These Comments

1. **Test Structure Comments** (Arrange/Act/Assert pattern)

   ```typescript
   // ❌ BAD
   // Arrange
   const mockData = { foo: 'bar' };
   // Act
   const result = fn(mockData);
   // Assert
   expect(result).toBe(true);
   ```

   **Why**: Test structure is self-evident. Use descriptive test names instead.

2. **Obvious Mock Setup**

   ```typescript
   // ❌ BAD
   // Mock the usePerpsConnection hook
   jest.mock('../../hooks/usePerpsConnection');
   ```

   **Why**: `jest.mock()` is self-documenting. Only comment on WHY a complex mock is needed.

3. **Redundant Action Descriptions**

   ```typescript
   // ❌ BAD
   // Clear the mock
   mockFn.mockClear();
   // Wait for async operations
   await waitFor(() => {...});
   ```

   **Why**: Code is already clear. Comment only when timing/order is critical for non-obvious reasons.

4. **Comments Describing Test Assertions**

   ```typescript
   // ❌ BAD
   // Verify discount is cleared after order placement
   expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(undefined);
   ```

   **Why**: Assertion is self-explanatory. Use descriptive test names to convey intent.

5. **Comments Referencing Previous Code**

   ```typescript
   // ❌ BAD
   // Changed from old implementation
   // Previously used getAccountState()
   // Now using ping() instead
   ```

   **Why**: Git history tracks changes. Comments should explain current behavior, not history.

6. **Comments Restating Variable Names**
   ```typescript
   // ❌ BAD
   // Store the error for assertion
   const errorResult = await catchError();
   ```
   **Why**: Variable name already conveys purpose.

### ✅ ALWAYS Write These Comments

1. **Architectural Decisions & "Why"**

   ```typescript
   // ✅ GOOD
   // Use WebSocket ping instead of HTTP getAccountState() to avoid blocking the connection
   // This eliminates the ~500ms overhead on initial connection and account switches
   await provider.ping(WEBSOCKET_PING_TIMEOUT_MS);
   ```

2. **Non-Obvious Timeouts & Magic Numbers**

   ```typescript
   // ✅ GOOD
   CONNECTION_ATTEMPT_TIMEOUT_MS: 30_000, // 30s timeout prevents indefinite hanging on network issues
   ```

3. **Race Condition & Concurrency Handling**

   ```typescript
   // ✅ GOOD
   // Add 300ms delay to avoid race conditions with system wake-up after backgrounding
   await sleep(FOREGROUND_RECONNECTION_DELAY_MS);
   ```

4. **Business Logic & Domain Knowledge**

   ```typescript
   // ✅ GOOD
   // HyperLiquid requires fee discount to be set as basis points (6500 = 65%)
   // and cleared after each trading operation to prevent discount leakage
   await provider.setUserFeeDiscount(discountBps);
   ```

5. **Workarounds & Limitations**

   ```typescript
   // ✅ GOOD
   // Temporary: Multiple interval subscriptions until backend supports efficient caching
   // See MIGRATION_PLAN_CANDLES.md for long-term solution
   ```

6. **System-Wide Conventions**
   ```typescript
   // ✅ GOOD
   // Metric naming convention: perps.{category}.{metric_name}
   // Enables hierarchical filtering in Sentry dashboards (e.g., perps.websocket.*)
   ```

### Comment Quality Checklist

Before writing a comment, ask:

- ✅ Does this explain **WHY**, not WHAT?
- ✅ Would this be unclear to someone unfamiliar with the business domain?
- ✅ Does this document a non-obvious decision or trade-off?
- ✅ Is this explaining complex timing, concurrency, or edge case handling?

If all answers are "no", **delete the comment**.

### Examples: Refactoring Comments

```typescript
// ❌ BEFORE: Noisy
describe('fee discounts', () => {
  it('should apply fee discount when placing order with rewards', async () => {
    // Arrange
    const orderParams = { coin: 'BTC', isBuy: true, size: '0.1' };
    // Mock provider
    (controller as any).isInitialized = true;
    // Mock the private calculateUserFeeDiscount method to return 65% discount
    jest
      .spyOn(controller as any, 'calculateUserFeeDiscount')
      .mockResolvedValue(6500);

    // Act
    const result = await controller.placeOrder(orderParams);

    // Assert
    expect(result).toEqual(mockOrderResult);
  });
});

// ✅ AFTER: Signal only
describe('fee discounts', () => {
  it('applies rewards discount during order placement and clears after', async () => {
    const orderParams = { coin: 'BTC', isBuy: true, size: '0.1' };
    (controller as any).isInitialized = true;
    jest
      .spyOn(controller as any, 'calculateUserFeeDiscount')
      .mockResolvedValue(6500);

    const result = await controller.placeOrder(orderParams);

    expect(mockProvider.setUserFeeDiscount).toHaveBeenCalledWith(6500);
    expect(mockProvider.setUserFeeDiscount).toHaveBeenLastCalledWith(undefined);
  });
});
```

### ESLint Rule (Optional)

Consider adding this to `.eslintrc.js` to catch common violations:

```javascript
'no-warning-comments': ['warn', {
  terms: ['arrange', 'act', 'assert', 'mock the', 'clear the', 'wait for'],
  location: 'anywhere'
}]
```
