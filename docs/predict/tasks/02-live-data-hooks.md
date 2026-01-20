# Task 02: Live Data Hooks

## Description

Create React hooks that provide easy access to live game updates and market price updates from the WebSocketManager. These hooks will be consumed by UI components.

## Requirements

- `useLiveGameUpdates` hook for game score/status updates
- `useLiveMarketPrices` hook for multiple token price updates
- `useLiveTokenPrice` hook for SINGLE token price (used by position rows)
- Clean subscription management with automatic cleanup
- Local React state for high-frequency updates (not Redux)
- **Granular subscriptions pattern** - NO composite hooks
- Comprehensive unit tests

## Granular Subscriptions Pattern (CRITICAL)

**DO NOT create a composite hook that aggregates all data.** Each component subscribes to only the data it needs at the lowest level to minimize React re-renders.

| Component                      | Hook to Use                     |
| ------------------------------ | ------------------------------- |
| GameScoreboard                 | `useLiveGameUpdates(gameId)`    |
| PredictGameChart               | `useLiveMarketPrices(tokenIds)` |
| ActionButtons (footer)         | `useLiveMarketPrices(tokenIds)` |
| PredictGamePosition (each row) | `useLiveTokenPrice(tokenId)`    |

**Why this matters**: If we used a composite hook at the parent level, ANY update (game score, any price) would re-render the ENTIRE tree. With granular subscriptions, only the affected component re-renders.

## Dependencies

- Task 00: Feature Flag and Data Types
- Task 01: WebSocket Manager

## Designs

- N/A (infrastructure task)

## Implementation

### 1. useLiveGameUpdates Hook

Create `app/components/UI/Predict/hooks/useLiveGameUpdates.ts`:

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { GameUpdate, PredictGameStatus } from '../types';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';

export interface UseLiveGameUpdatesOptions {
  enabled?: boolean;
}

export interface UseLiveGameUpdatesResult {
  gameUpdate: GameUpdate | null;
  isConnected: boolean;
  lastUpdateTime: number | null;
}

export const useLiveGameUpdates = (
  gameId: string | null,
  options: UseLiveGameUpdatesOptions = {},
): UseLiveGameUpdatesResult => {
  const { enabled = true } = options;

  const [gameUpdate, setGameUpdate] = useState<GameUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  const isMountedRef = useRef(true);

  const handleGameUpdate = useCallback((update: GameUpdate) => {
    if (!isMountedRef.current) return;

    setGameUpdate(update);
    setLastUpdateTime(Date.now());
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !gameId) {
      setGameUpdate(null);
      setIsConnected(false);
      return;
    }

    const manager = WebSocketManager.getInstance();
    const unsubscribe = manager.subscribeToGame(gameId, handleGameUpdate);

    // Check connection status periodically
    const checkConnection = () => {
      if (!isMountedRef.current) return;
      const status = manager.getConnectionStatus();
      setIsConnected(status.sportsConnected);
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [gameId, enabled, handleGameUpdate]);

  return {
    gameUpdate,
    isConnected,
    lastUpdateTime,
  };
};
```

### 2. useLiveMarketPrices Hook

Create `app/components/UI/Predict/hooks/useLiveMarketPrices.ts`:

```typescript
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { PriceUpdate } from '../types';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';

export interface UseLiveMarketPricesOptions {
  enabled?: boolean;
}

export interface UseLiveMarketPricesResult {
  prices: Map<string, PriceUpdate>;
  getPrice: (tokenId: string) => PriceUpdate | undefined;
  isConnected: boolean;
  lastUpdateTime: number | null;
}

export const useLiveMarketPrices = (
  tokenIds: string[],
  options: UseLiveMarketPricesOptions = {},
): UseLiveMarketPricesResult => {
  const { enabled = true } = options;

  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  const isMountedRef = useRef(true);

  // Memoize tokenIds to prevent unnecessary re-subscriptions
  const tokenIdsKey = useMemo(() => tokenIds.sort().join(','), [tokenIds]);

  const handlePriceUpdates = useCallback((updates: PriceUpdate[]) => {
    if (!isMountedRef.current) return;

    setPrices((prevPrices) => {
      const newPrices = new Map(prevPrices);
      updates.forEach((update) => {
        newPrices.set(update.tokenId, update);
      });
      return newPrices;
    });

    setLastUpdateTime(Date.now());
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || tokenIds.length === 0) {
      setPrices(new Map());
      setIsConnected(false);
      return;
    }

    const manager = WebSocketManager.getInstance();
    const unsubscribe = manager.subscribeToMarketPrices(
      tokenIds,
      handlePriceUpdates,
    );

    // Check connection status periodically
    const checkConnection = () => {
      if (!isMountedRef.current) return;
      const status = manager.getConnectionStatus();
      setIsConnected(status.marketConnected);
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [tokenIdsKey, enabled, handlePriceUpdates]);

  const getPrice = useCallback(
    (tokenId: string): PriceUpdate | undefined => {
      return prices.get(tokenId);
    },
    [prices],
  );

  return {
    prices,
    getPrice,
    isConnected,
    lastUpdateTime,
  };
};
```

### 3. useLiveTokenPrice Hook (for individual position rows)

Create `app/components/UI/Predict/hooks/useLiveTokenPrice.ts`:

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { PriceUpdate } from '../types';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';

export interface UseLiveTokenPriceOptions {
  enabled?: boolean;
}

export interface UseLiveTokenPriceResult {
  price: PriceUpdate | null;
  isConnected: boolean;
}

/**
 * Subscribe to price updates for a SINGLE token.
 * Use this hook for individual position rows to minimize re-renders.
 *
 * When price updates come in, ONLY this position row re-renders,
 * not the entire positions list or parent components.
 */
export const useLiveTokenPrice = (
  tokenId: string | null,
  options: UseLiveTokenPriceOptions = {},
): UseLiveTokenPriceResult => {
  const { enabled = true } = options;

  const [price, setPrice] = useState<PriceUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const isMountedRef = useRef(true);

  const handlePriceUpdates = useCallback(
    (updates: PriceUpdate[]) => {
      if (!isMountedRef.current || !tokenId) return;

      // Find update for our specific token
      const ourUpdate = updates.find((u) => u.tokenId === tokenId);
      if (ourUpdate) {
        setPrice(ourUpdate);
      }
    },
    [tokenId],
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled || !tokenId) {
      setPrice(null);
      setIsConnected(false);
      return;
    }

    const manager = WebSocketManager.getInstance();
    // Subscribe to just this one token
    const unsubscribe = manager.subscribeToMarketPrices(
      [tokenId],
      handlePriceUpdates,
    );

    // Check connection status periodically
    const checkConnection = () => {
      if (!isMountedRef.current) return;
      const status = manager.getConnectionStatus();
      setIsConnected(status.marketConnected);
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [tokenId, enabled, handlePriceUpdates]);

  return {
    price,
    isConnected,
  };
};
```

**IMPORTANT: DO NOT create a composite hook (like `usePredictGameData`).** Each component should use the appropriate granular hook directly.

### 4. Export Hooks

Update `app/components/UI/Predict/hooks/index.ts` to export new hooks.

### 5. Unit Tests

Create test files for each hook:

**`app/components/UI/Predict/hooks/useLiveGameUpdates.test.ts`:**

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useLiveGameUpdates } from './useLiveGameUpdates';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';

jest.mock('../providers/polymarket/WebSocketManager');

describe('useLiveGameUpdates', () => {
  const mockSubscribeToGame = jest.fn();
  const mockGetConnectionStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (WebSocketManager.getInstance as jest.Mock).mockReturnValue({
      subscribeToGame: mockSubscribeToGame,
      getConnectionStatus: mockGetConnectionStatus.mockReturnValue({
        sportsConnected: true,
      }),
    });
    mockSubscribeToGame.mockReturnValue(jest.fn());
  });

  it('subscribes to game updates when gameId is provided', () => {
    renderHook(() => useLiveGameUpdates('game123'));

    expect(mockSubscribeToGame).toHaveBeenCalledWith(
      'game123',
      expect.any(Function),
    );
  });

  it('does not subscribe when gameId is null', () => {
    renderHook(() => useLiveGameUpdates(null));

    expect(mockSubscribeToGame).not.toHaveBeenCalled();
  });

  it('does not subscribe when enabled is false', () => {
    renderHook(() => useLiveGameUpdates('game123', { enabled: false }));

    expect(mockSubscribeToGame).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = jest.fn();
    mockSubscribeToGame.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useLiveGameUpdates('game123'));
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('updates gameUpdate when callback is called', () => {
    let capturedCallback: Function;
    mockSubscribeToGame.mockImplementation((_, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveGameUpdates('game123'));

    act(() => {
      capturedCallback({
        gameId: 'game123',
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        status: 'ongoing',
      });
    });

    expect(result.current.gameUpdate).toEqual({
      gameId: 'game123',
      score: '21-14',
      elapsed: '12:34',
      period: 'Q2',
      status: 'ongoing',
    });
  });
});
```

**`app/components/UI/Predict/hooks/useLiveMarketPrices.test.ts`:**

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useLiveMarketPrices } from './useLiveMarketPrices';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';

jest.mock('../providers/polymarket/WebSocketManager');

describe('useLiveMarketPrices', () => {
  const mockSubscribeToMarketPrices = jest.fn();
  const mockGetConnectionStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (WebSocketManager.getInstance as jest.Mock).mockReturnValue({
      subscribeToMarketPrices: mockSubscribeToMarketPrices,
      getConnectionStatus: mockGetConnectionStatus.mockReturnValue({
        marketConnected: true,
      }),
    });
    mockSubscribeToMarketPrices.mockReturnValue(jest.fn());
  });

  it('subscribes to price updates when tokenIds are provided', () => {
    renderHook(() => useLiveMarketPrices(['token1', 'token2']));

    expect(mockSubscribeToMarketPrices).toHaveBeenCalledWith(
      ['token1', 'token2'],
      expect.any(Function),
    );
  });

  it('does not subscribe when tokenIds is empty', () => {
    renderHook(() => useLiveMarketPrices([]));

    expect(mockSubscribeToMarketPrices).not.toHaveBeenCalled();
  });

  it('updates prices when callback is called', () => {
    let capturedCallback: Function;
    mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveMarketPrices(['token1']));

    act(() => {
      capturedCallback([
        { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
      ]);
    });

    expect(result.current.prices.get('token1')).toEqual({
      tokenId: 'token1',
      price: 0.75,
      bestBid: 0.74,
      bestAsk: 0.76,
    });
  });

  it('getPrice helper returns correct price', () => {
    let capturedCallback: Function;
    mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveMarketPrices(['token1']));

    act(() => {
      capturedCallback([
        { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
      ]);
    });

    expect(result.current.getPrice('token1')?.price).toBe(0.75);
    expect(result.current.getPrice('token2')).toBeUndefined();
  });
});
```

**`app/components/UI/Predict/hooks/useLiveTokenPrice.test.ts`:**

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useLiveTokenPrice } from './useLiveTokenPrice';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';

jest.mock('../providers/polymarket/WebSocketManager');

describe('useLiveTokenPrice', () => {
  const mockSubscribeToMarketPrices = jest.fn();
  const mockGetConnectionStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (WebSocketManager.getInstance as jest.Mock).mockReturnValue({
      subscribeToMarketPrices: mockSubscribeToMarketPrices,
      getConnectionStatus: mockGetConnectionStatus.mockReturnValue({
        marketConnected: true,
      }),
    });
    mockSubscribeToMarketPrices.mockReturnValue(jest.fn());
  });

  it('subscribes to single token when tokenId is provided', () => {
    renderHook(() => useLiveTokenPrice('token1'));

    expect(mockSubscribeToMarketPrices).toHaveBeenCalledWith(
      ['token1'], // Single token array
      expect.any(Function),
    );
  });

  it('does not subscribe when tokenId is null', () => {
    renderHook(() => useLiveTokenPrice(null));

    expect(mockSubscribeToMarketPrices).not.toHaveBeenCalled();
  });

  it('updates price when relevant update is received', () => {
    let capturedCallback: Function;
    mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveTokenPrice('token1'));

    act(() => {
      // Callback receives array but we only care about our token
      capturedCallback([
        { tokenId: 'token1', price: 0.75, bestBid: 0.74, bestAsk: 0.76 },
        { tokenId: 'token2', price: 0.25, bestBid: 0.24, bestAsk: 0.26 },
      ]);
    });

    // Only token1 price should be captured
    expect(result.current.price).toEqual({
      tokenId: 'token1',
      price: 0.75,
      bestBid: 0.74,
      bestAsk: 0.76,
    });
  });

  it('ignores updates for other tokens', () => {
    let capturedCallback: Function;
    mockSubscribeToMarketPrices.mockImplementation((_, callback) => {
      capturedCallback = callback;
      return jest.fn();
    });

    const { result } = renderHook(() => useLiveTokenPrice('token1'));

    act(() => {
      // Only token2 update - token1 should remain null
      capturedCallback([
        { tokenId: 'token2', price: 0.25, bestBid: 0.24, bestAsk: 0.26 },
      ]);
    });

    expect(result.current.price).toBeNull();
  });
});
```

## Files to Create/Modify

| Action | File                                                          |
| ------ | ------------------------------------------------------------- |
| Create | `app/components/UI/Predict/hooks/useLiveGameUpdates.ts`       |
| Create | `app/components/UI/Predict/hooks/useLiveGameUpdates.test.ts`  |
| Create | `app/components/UI/Predict/hooks/useLiveMarketPrices.ts`      |
| Create | `app/components/UI/Predict/hooks/useLiveMarketPrices.test.ts` |
| Create | `app/components/UI/Predict/hooks/useLiveTokenPrice.ts`        |
| Create | `app/components/UI/Predict/hooks/useLiveTokenPrice.test.ts`   |
| Modify | `app/components/UI/Predict/hooks/index.ts`                    |

**NOTE**: There is NO `usePredictGameData` composite hook. Each component subscribes to its own data.

## Acceptance Criteria

- [ ] `useLiveGameUpdates` hook implemented and tested
- [ ] `useLiveMarketPrices` hook implemented and tested
- [ ] `useLiveTokenPrice` hook implemented and tested (for single token subscriptions)
- [ ] All hooks properly clean up subscriptions on unmount
- [ ] Connection status is accurately reported
- [ ] **NO composite hook created** - granular subscriptions enforced
- [ ] All unit tests pass

## Estimated Effort

4-6 hours

## Assignee

Developer A (Infrastructure Track)
