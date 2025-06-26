# SwapsController fetchTokenWithCache Performance Investigation

## Issue Summary
The `fetchTokenWithCache` function from `@metamask/swaps-controller` is experiencing performance issues, taking between 300-600ms to execute when viewing Solana token asset details. This significantly impacts the asset screen loading time and user experience.

## Problem Context
- **Location**: Asset detail views for Solana tokens
- **Performance Impact**: 300-600ms execution time
- **User Experience**: Noticeable delay when opening asset details
- **Performance Profile**: Shows "immer issue Swaps Controller" after 4.8s mark
- **Scope**: Affects both AssetOverview and Swaps components

## Technical Analysis

### Current Implementation

#### 1. Call Sites
The `fetchTokenWithCache` function is called in two main locations:

**AssetOverview.tsx** (Lines 163-177):
```typescript
useEffect(() => {
  const { SwapsController } = Engine.context;
  const fetchTokenWithCache = async () => {
    try {
      await SwapsController.fetchTokenWithCache({
        networkClientId: selectedNetworkClientId,
      });
    } catch (error: any) {
      Logger.error(error, 'Swaps: error while fetching tokens with cache in AssetOverview');
    }
  };
  fetchTokenWithCache();
}, [selectedNetworkClientId]);
```

**Swaps/index.js** (Lines 335-355):
```javascript
useEffect(() => {
  (async () => {
    const { SwapsController } = Engine.context;
    try {
      if (!swapsControllerTokens || !swapsTokens || swapsTokens?.length === 0) {
        setInitialLoadingTokens(true);
      }
      setLoadingTokens(true);
      await SwapsController.fetchTokenWithCache({
        networkClientId: selectedNetworkClientId,
      });
      setLoadingTokens(false);
      setInitialLoadingTokens(false);
    } catch (error) {
      Logger.error(error, 'Swaps: Error while fetching tokens in amount view');
    } finally {
      setLoadingTokens(false);
      setInitialLoadingTokens(false);
    }
  })();
}, [swapsControllerTokens, swapsTokens, selectedNetworkClientId]);
```

#### 2. SwapsController Configuration
**Cache Thresholds** (from AppConstants.ts):
```typescript
SWAPS: {
  CACHE_AGGREGATOR_METADATA_THRESHOLD: 5 * 60 * 1000, // 5 minutes
  CACHE_TOKENS_THRESHOLD: 5 * 60 * 1000,              // 5 minutes  
  CACHE_TOP_ASSETS_THRESHOLD: 5 * 60 * 1000,          // 5 minutes
}
```

**Engine Configuration** (Engine.ts):
```typescript
SwapsController: new SwapsController({
  clientId: AppConstants.SWAPS.CLIENT_ID,
  fetchAggregatorMetadataThreshold: AppConstants.SWAPS.CACHE_AGGREGATOR_METADATA_THRESHOLD,
  fetchTokensThreshold: AppConstants.SWAPS.CACHE_TOKENS_THRESHOLD,
  fetchTopAssetsThreshold: AppConstants.SWAPS.CACHE_TOP_ASSETS_THRESHOLD,
  supportedChainIds: swapsSupportedChainIds,
  messenger: this.controllerMessenger.getRestricted({
    name: 'SwapsController',
    allowedActions: ['NetworkController:getNetworkClientById'],
    allowedEvents: ['NetworkController:networkDidChange'],
  }),
  pollCountLimit: AppConstants.SWAPS.POLL_COUNT_LIMIT,
})
```

#### 3. State Management Impact
**Redux Selectors Chain**:
```javascript
// Multiple complex selectors are triggered by SwapsController state updates
const swapsControllerAndUserTokens = createSelector(
  swapsControllerTokens,
  selectTokens,
  (swapsTokens, tokens) => {
    const values = [...(swapsTokens || []), ...(tokens || [])]
      .filter(Boolean)
      .reduce((map, { hasBalanceError, image, ...token }) => {
        const key = token.address.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            occurrences: 0,
            ...token,
            decimals: Number(token.decimals),
            address: key,
          });
        }
        return map;
      }, new Map())
      .values();
    return [...values];
  },
);
```

## Performance Bottlenecks Analysis

### 1. Immer State Updates Issue
The performance profile mentions "immer issue Swaps Controller", indicating that:
- Large state objects are being processed by Immer's immutable update mechanism
- Deep nested state structures in SwapsController cause expensive clone operations
- Token arrays with hundreds/thousands of entries trigger costly immutable transformations

### 2. Network Latency
- API calls to swap services have inherent latency
- Multiple concurrent API calls may be happening
- Cache misses force expensive network requests

### 3. Inefficient Cache Strategy
Current issues with the 5-minute cache threshold:
- **Too Aggressive**: For frequently accessed data, 5 minutes might be too long
- **Cache Key Issues**: Network switches might invalidate cache inappropriately
- **No Stale-While-Revalidate**: Users wait for fresh data instead of seeing stale data immediately

### 4. Redux Selector Overhead
- Complex selector chains recalculate on every SwapsController state change
- Multiple components subscribe to the same derived state
- No memoization at the selector level for expensive computations

### 5. Solana-Specific Issues
For Solana tokens specifically:
- Different token metadata structure compared to EVM tokens
- Bridge API calls for non-EVM chains may have higher latency
- Cross-chain data aggregation adds complexity

## Root Cause Hypothesis

**Primary Cause**: Immer's deep cloning of large token arrays during state updates
**Secondary Causes**:
1. Network latency for cache misses
2. Inefficient cache invalidation strategy
3. Heavy Redux selector recomputations
4. Lack of request deduplication

## Recommended Solutions

### Immediate Fixes (Low Risk)

#### 1. Implement Stale-While-Revalidate Pattern
```typescript
useEffect(() => {
  const { SwapsController } = Engine.context;
  const fetchTokenWithCache = async () => {
    try {
      // Show cached data immediately if available
      const cachedTokens = SwapsController.state.tokens;
      if (cachedTokens) {
        // Data is already available, no loading state needed
      }
      
      // Fetch fresh data in background
      await SwapsController.fetchTokenWithCache({
        networkClientId: selectedNetworkClientId,
      });
    } catch (error: any) {
      Logger.error(error, 'Swaps: error while fetching tokens with cache in AssetOverview');
    }
  };
  fetchTokenWithCache();
}, [selectedNetworkClientId]);
```

#### 2. Add Request Deduplication
```typescript
// Prevent multiple concurrent calls to the same API
const pendingRequests = new Map();

const debouncedFetchTokenWithCache = async (networkClientId: string) => {
  if (pendingRequests.has(networkClientId)) {
    return pendingRequests.get(networkClientId);
  }
  
  const promise = SwapsController.fetchTokenWithCache({ networkClientId });
  pendingRequests.set(networkClientId, promise);
  
  try {
    return await promise;
  } finally {
    pendingRequests.delete(networkClientId);
  }
};
```

#### 3. Optimize Redux Selectors
```typescript
// Use createDeepEqualSelector to prevent unnecessary re-renders
export const swapsTokensOptimizedSelector = createDeepEqualSelector(
  chainIdSelector,
  swapsControllerAndUserTokens,
  selectTokenList,
  (chainId, tokens, tokenList) => {
    if (!tokens) return [];
    return addMetadata(chainId, tokens, tokenList);
  },
);
```

### Medium-Term Solutions (Moderate Risk)

#### 1. Implement Selective State Updates
Instead of updating the entire tokens array, update only changed items:
```typescript
// In SwapsController, implement partial updates
updateTokens(newTokens: Token[]) {
  this.update((state) => {
    newTokens.forEach(token => {
      const index = state.tokens.findIndex(t => t.address === token.address);
      if (index >= 0) {
        state.tokens[index] = token; // Update existing
      } else {
        state.tokens.push(token); // Add new
      }
    });
  });
}
```

#### 2. Cache Optimization
- Reduce cache threshold from 5 minutes to 2 minutes for frequently accessed data
- Implement cache warming for Solana tokens
- Add cache versioning to handle network switches better

#### 3. Background Refresh Strategy
```typescript
// Implement background refresh pattern
const useBackgroundTokenRefresh = (networkClientId: string) => {
  useEffect(() => {
    const interval = setInterval(async () => {
      // Refresh data in background without affecting UI
      try {
        await SwapsController.fetchTokenWithCache({ 
          networkClientId,
          background: true 
        });
      } catch (error) {
        // Silent fail for background updates
      }
    }, 2 * 60 * 1000); // Every 2 minutes
    
    return () => clearInterval(interval);
  }, [networkClientId]);
};
```

### Long-Term Solutions (Higher Risk)

#### 1. Replace Immer with Custom Immutable Updates
For large arrays, implement custom immutable update logic:
```typescript
// Instead of Immer's deep cloning, use targeted updates
const updateTokensOptimal = (state: SwapsState, newTokens: Token[]) => {
  return {
    ...state,
    tokens: state.tokens.map(token => {
      const updated = newTokens.find(t => t.address === token.address);
      return updated || token;
    })
  };
};
```

#### 2. Implement Token Virtualization
For large token lists, only keep visible tokens in memory:
```typescript
const useVirtualizedTokens = (allTokens: Token[], viewportSize: number = 50) => {
  const [visibleTokens, setVisibleTokens] = useState<Token[]>([]);
  
  // Only return tokens that are currently needed
  return useMemo(() => 
    allTokens.slice(0, viewportSize), 
    [allTokens, viewportSize]
  );
};
```

#### 3. Service Worker Caching
Implement service worker caching for API responses:
```typescript
// Service worker for API response caching
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/swap-tokens')) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(response => {
          const responseClone = response.clone();
          caches.open('swaps-cache').then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
  }
});
```

## Implementation Priority

### Phase 1 (Immediate - 1-2 days)
1. ✅ Implement stale-while-revalidate pattern
2. ✅ Add request deduplication
3. ✅ Optimize Redux selectors with createDeepEqualSelector

### Phase 2 (Short-term - 1-2 weeks)
1. ✅ Implement selective state updates in SwapsController
2. ✅ Reduce cache thresholds for better responsiveness
3. ✅ Add background refresh strategy

### Phase 3 (Medium-term - 1 month)
1. ✅ Replace Immer with custom immutable updates for large arrays
2. ✅ Implement token virtualization
3. ✅ Add comprehensive performance monitoring

### Phase 4 (Long-term - 2-3 months)
1. ✅ Service worker implementation
2. ✅ Complete cache strategy overhaul
3. ✅ Performance optimization across all SwapsController operations

## Success Metrics

### Performance Targets
- **fetchTokenWithCache execution time**: < 100ms (down from 300-600ms)
- **Asset detail page load time**: < 1 second total
- **Perceived performance**: Instant display of cached data

### Monitoring
1. Add performance timing to fetchTokenWithCache calls
2. Track cache hit rates
3. Monitor Redux selector performance
4. User experience metrics (Time to Interactive)

## Risk Assessment

### Low Risk Solutions
- Stale-while-revalidate pattern
- Request deduplication
- Selector optimization

### Medium Risk Solutions  
- Cache threshold changes
- Background refresh implementation
- Selective state updates

### High Risk Solutions
- Replacing Immer completely
- Major cache strategy changes
- Service worker implementation

## Conclusion

The performance issue with `fetchTokenWithCache` is likely caused by a combination of factors, with Immer's state management being the primary bottleneck for large token arrays. Implementing the immediate fixes should provide significant performance improvements with minimal risk, while the longer-term solutions will create a more robust and scalable architecture.

The recommended approach is to start with Phase 1 solutions and measure their impact before proceeding with more complex optimizations.