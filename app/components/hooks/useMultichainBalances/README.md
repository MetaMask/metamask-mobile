# useMultichainBalancesForAllAccounts Hook

This hook provides balance data for all accounts across multiple chains. It comes in two versions: synchronous and asynchronous.

## Synchronous Version (Default)

The default export provides immediate balance data without loading states:

```typescript
import useMultichainBalancesForAllAccounts from './useMultichainBalancesForAllAccounts';

const { multichainBalancesForAllAccounts } = useMultichainBalancesForAllAccounts();
```

**Pros:**
- Immediate data access
- No loading states to manage
- Simpler API

**Cons:**
- No error handling
- No loading indicators
- May block UI if computation is heavy

## Asynchronous Version

The async version provides loading states and error handling:

```typescript
import { useMultichainBalancesForAllAccountsAsync } from './useMultichainBalancesForAllAccounts';

const { 
  multichainBalancesForAllAccounts, 
  isLoading, 
  error 
} = useMultichainBalancesForAllAccountsAsync();
```

**Pros:**
- Loading states for better UX
- Error handling
- Non-blocking UI
- Can handle actual async operations

**Cons:**
- More complex API
- Requires loading state management

## When to Use Each Version

### Use Synchronous Version When:
- You need immediate data access
- The computation is fast and lightweight
- You don't need loading indicators
- You're in a simple component that doesn't need error handling

### Use Asynchronous Version When:
- You need to show loading states
- You want to handle errors gracefully
- The computation might be heavy
- You plan to add actual async operations (API calls, etc.)
- You're building a complex UI that needs better UX

## Example Usage

See `useMultichainBalancesForAllAccounts.example.ts` for a complete example of using the async version.

## Making It Truly Async

To make the hook truly async, you could:

1. **Add API calls**: Replace the simulated delay with actual API calls to fetch balance data
2. **Add caching**: Implement caching to avoid unnecessary API calls
3. **Add retry logic**: Implement retry mechanisms for failed requests
4. **Add background updates**: Periodically refresh balances in the background

Example of adding actual async operations:

```typescript
const computeBalances = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(undefined);

    // Make actual API calls here
    const balancePromises = accountsList.map(async (account) => {
      const balance = await fetchAccountBalance(account.id);
      return { accountId: account.id, balance };
    });

    const balanceResults = await Promise.all(balancePromises);
    
    // Process results...
    const result = processBalanceResults(balanceResults);
    setBalances(result);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to compute balances');
  } finally {
    setIsLoading(false);
  }
}, [accountsList]);
``` 
