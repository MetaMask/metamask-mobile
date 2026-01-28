# Predict Feature Implementation Guide

This document provides code patterns, anti-patterns, and migration examples for refactoring the Predict feature. Use this as a reference when implementing tasks from the [Refactoring Tasks](./refactoring-tasks.md) document.

## Table of Contents

- [Design System Components](#design-system-components)
- [Styling Patterns](#styling-patterns)
- [Component Patterns](#component-patterns)
- [Hook Patterns](#hook-patterns)
- [Error Handling Patterns](#error-handling-patterns)
- [Testing Patterns](#testing-patterns)
- [Migration Examples](#migration-examples)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Design System Components

### Component Hierarchy (STRICT ORDER)

Always follow this priority when choosing components:

1. **FIRST**: `@metamask/design-system-react-native` (Box, Text, Button, Icon, Avatar, Badge, Checkbox)
2. **SECOND**: `app/component-library` (BottomSheet, Tabs, Headers, ListItems, Skeleton, Tags, Modal)
3. **THIRD**: Feature-specific components built with design system primitives
4. **LAST**: Custom components (requires strong justification)

### Required Imports

```tsx
// ALWAYS use these imports
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  Button,
  ButtonBase,
  Icon,
  TextVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';
```

### Box Component Quick Reference

```tsx
// Layout props (prefer these over twClassName for layout)
<Box
  flexDirection={BoxFlexDirection.Row}
  alignItems={BoxAlignItems.Center}
  justifyContent={BoxJustifyContent.Between}
  gap={3}           // 12px (each unit = 4px)
  padding={4}       // 16px
  margin={2}        // 8px
>

// Use twClassName for:
// - Width/height: w-full, h-20
// - Positioning: absolute, relative, top-0
// - Borders: rounded-lg, border-t
// - Shadows: shadow-lg
// - Overflow: overflow-hidden
<Box twClassName="w-full h-20 rounded-lg overflow-hidden">
```

### Text Component Quick Reference

```tsx
// Typography variants
<Text variant={TextVariant.HeadingLg}>Large Heading</Text>
<Text variant={TextVariant.HeadingMd}>Medium Heading</Text>
<Text variant={TextVariant.HeadingSm}>Small Heading</Text>
<Text variant={TextVariant.BodyLg}>Large Body</Text>
<Text variant={TextVariant.BodyMd}>Medium Body (default)</Text>
<Text variant={TextVariant.BodySm}>Small Body</Text>

// Font weight
<Text fontWeight={FontWeight.Bold}>Bold text</Text>
<Text fontWeight={FontWeight.Medium}>Medium text</Text>
<Text fontWeight={FontWeight.Regular}>Regular text</Text>

// Color (use semantic tokens)
<Text twClassName="text-primary">Primary text</Text>
<Text twClassName="text-muted">Muted text</Text>
<Text twClassName="text-error-default">Error text</Text>
<Text twClassName="text-success-default">Success text</Text>
```

---

## Styling Patterns

### ✅ Correct: useTailwind Hook

```tsx
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const MyComponent = () => {
  const tw = useTailwind();

  return (
    <Box twClassName="w-full bg-default p-4 rounded-lg">
      <Text variant={TextVariant.HeadingMd}>Title</Text>
    </Box>
  );
};
```

### ✅ Correct: Interactive Styles with tw.style()

```tsx
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const InteractiveButton = () => {
  const tw = useTailwind();

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center justify-center py-3 px-4 rounded-lg',
          pressed ? 'bg-pressed' : 'bg-primary-default',
        )
      }
    >
      <Text twClassName="text-primary-inverse" fontWeight={FontWeight.Medium}>
        Press Me
      </Text>
    </Pressable>
  );
};
```

### ✅ Correct: ButtonBase with Style Function

```tsx
<ButtonBase
  twClassName="h-20 flex-1 rounded-lg bg-muted px-0 py-4"
  style={({ pressed }) =>
    tw.style(
      'w-full flex-row items-center justify-center',
      pressed && 'bg-pressed',
    )
  }
>
  <Text fontWeight={FontWeight.Medium}>Button Text</Text>
</ButtonBase>
```

### Color Tokens Reference

```tsx
// Background colors
bg-default           // Default background
bg-alternative       // Alternative background
bg-muted             // Muted/subtle background
bg-primary-default   // Primary action background
bg-primary-muted     // Muted primary background
bg-error-default     // Error background
bg-error-muted       // Muted error background
bg-success-default   // Success background
bg-warning-default   // Warning background
bg-pressed           // Pressed state background

// Text colors
text-primary         // Primary text
text-alternative     // Alternative text
text-muted           // Muted/secondary text
text-primary-inverse // Inverse text (on dark backgrounds)
text-error-default   // Error text
text-success-default // Success text
text-warning-default // Warning text

// Border colors
border-default       // Default border
border-muted         // Muted border
border-primary       // Primary border
border-error         // Error border
```

---

## Component Patterns

### ✅ Correct: Component Decomposition

```tsx
// views/PredictMarketDetails/PredictMarketDetails.tsx
// Keep this as orchestration only (<500 lines)

import { PredictMarketDetailsHeader } from './components/Header';
import { PredictMarketDetailsChart } from './components/Chart';
import { PredictMarketDetailsOutcomes } from './components/Outcomes';
import { PredictMarketDetailsActions } from './components/Actions';

const PredictMarketDetails = ({ marketId }) => {
  const { market, loading, error } = usePredictMarket(marketId);

  if (loading) return <PredictMarketDetailsSkeleton />;
  if (error) return <PredictMarketDetailsError error={error} />;

  return (
    <Box twClassName="flex-1 bg-default">
      <PredictMarketDetailsHeader market={market} />
      <PredictMarketDetailsChart market={market} />
      <PredictMarketDetailsOutcomes market={market} />
      <PredictMarketDetailsActions market={market} />
    </Box>
  );
};
```

### ✅ Correct: Memoized Sub-Components

```tsx
// views/PredictMarketDetails/components/Header/Header.tsx

import React, { memo } from 'react';

interface PredictMarketDetailsHeaderProps {
  market: PredictMarket;
  onShare?: () => void;
}

export const PredictMarketDetailsHeader = memo(
  ({ market, onShare }: PredictMarketDetailsHeaderProps) => {
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 py-3"
      >
        <Text variant={TextVariant.HeadingMd} twClassName="flex-1">
          {market.title}
        </Text>
        {onShare && (
          <ButtonBase onPress={onShare}>
            <Icon name="share" />
          </ButtonBase>
        )}
      </Box>
    );
  },
);

PredictMarketDetailsHeader.displayName = 'PredictMarketDetailsHeader';
```

### ✅ Correct: Context for Shared State

```tsx
// views/PredictFeed/PredictFeedContext.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import { SharedValue } from 'react-native-reanimated';

interface PredictFeedContextValue {
  scrollHandler: (event: any) => void;
  headerHeight: SharedValue<number>;
  tabBarHeight: number;
}

const PredictFeedContext = createContext<PredictFeedContextValue | null>(null);

export const usePredictFeedContext = () => {
  const context = useContext(PredictFeedContext);
  if (!context) {
    throw new Error(
      'usePredictFeedContext must be used within PredictFeedProvider',
    );
  }
  return context;
};

export const PredictFeedProvider = ({
  children,
  ...value
}: PredictFeedContextValue & { children: ReactNode }) => {
  return (
    <PredictFeedContext.Provider value={value}>
      {children}
    </PredictFeedContext.Provider>
  );
};
```

---

## Hook Patterns

### ✅ Correct: Hook Composition

```tsx
// hooks/usePredictBalance.ts

import { useCallback } from 'react';
import { useSelector } from 'react-redux';

export function usePredictBalance() {
  // Compose from other hooks
  const { getBalance } = usePredictTrading();
  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();

  // Read from Redux
  const balance = useSelector(selectPredictBalanceByAddress());

  // Memoize callbacks
  const loadBalance = useCallback(async () => {
    await ensurePolygonNetworkExists();
    await getBalance();
  }, [getBalance, ensurePolygonNetworkExists]);

  return {
    balance,
    loadBalance,
    isLoading: balance === undefined,
  };
}
```

### ✅ Correct: Unified Toast Hook

```tsx
// hooks/usePredictToast.ts

type ToastType = 'deposit' | 'claim' | 'withdraw' | 'order';

interface ToastConfig {
  type: ToastType;
}

export function usePredictToast({ type }: ToastConfig) {
  const { toastRef } = useContext(ToastContext);

  const showPending = useCallback(
    (message: string) => {
      toastRef.current?.showToast({
        variant: ToastVariants.Loading,
        labelOptions: { label: message },
      });
    },
    [toastRef],
  );

  const showSuccess = useCallback(
    (message: string) => {
      toastRef.current?.showToast({
        variant: ToastVariants.Success,
        labelOptions: { label: message },
      });
    },
    [toastRef],
  );

  const showError = useCallback(
    (message: string) => {
      toastRef.current?.showToast({
        variant: ToastVariants.Error,
        labelOptions: { label: message },
      });
    },
    [toastRef],
  );

  return { showPending, showSuccess, showError };
}

// Backward-compatible exports
export const usePredictDepositToasts = () =>
  usePredictToast({ type: 'deposit' });
export const usePredictClaimToasts = () => usePredictToast({ type: 'claim' });
export const usePredictWithdrawToasts = () =>
  usePredictToast({ type: 'withdraw' });
```

---

## Error Handling Patterns

### ✅ Correct: Extracted Error Handler

```tsx
// utils/controllerErrorHandler.ts

import { ensureError } from '@metamask/utils';
import Logger from '../../../util/Logger';
import { Result } from '../types';

interface ErrorContext {
  operation: string;
  [key: string]: unknown;
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  updateLastError: (message: string) => void,
): Promise<Result<T>> {
  try {
    const response = await operation();
    return { success: true, response };
  } catch (error) {
    const e = ensureError(error);
    Logger.error(e, {
      message: `PredictController: ${context.operation} failed`,
      ...context,
    });
    updateLastError(e.message);
    return { success: false, error: e.message };
  }
}
```

### ✅ Correct: Using Error Handler in Controller

```tsx
// controllers/PredictController.ts

import { withErrorHandling } from '../utils/controllerErrorHandler';

class PredictController {
  #updateLastError(message: string) {
    this.update({ lastError: message });
  }

  async placeBuyOrder(params: BuyOrderParams): Promise<Result<Order>> {
    return withErrorHandling(
      async () => {
        // Actual operation
        const order = await this.provider.placeBuyOrder(params);
        return order;
      },
      { operation: 'placeBuyOrder', marketId: params.marketId },
      this.#updateLastError.bind(this),
    );
  }

  async placeSellOrder(params: SellOrderParams): Promise<Result<Order>> {
    return withErrorHandling(
      async () => {
        const order = await this.provider.placeSellOrder(params);
        return order;
      },
      { operation: 'placeSellOrder', marketId: params.marketId },
      this.#updateLastError.bind(this),
    );
  }
}
```

---

## Testing Patterns

### Test Structure (AAA Pattern)

```tsx
// ComponentName.test.tsx

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { PredictMarketCard } from './PredictMarketCard';
import { renderWithProvider } from '../../../test/utils';
import { createMockMarket } from '../mocks/market';

describe('PredictMarketCard', () => {
  // ARRANGE: Setup mocks before tests
  const mockOnPress = jest.fn();
  const mockMarket = createMockMarket({
    title: 'Will BTC reach $100k?',
    probability: 0.65,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders market title correctly', () => {
    // ARRANGE
    const { getByText } = renderWithProvider(
      <PredictMarketCard market={mockMarket} onPress={mockOnPress} />,
    );

    // ACT (none needed for this test)

    // ASSERT
    expect(getByText('Will BTC reach $100k?')).toBeTruthy();
  });

  it('displays probability as percentage', () => {
    // ARRANGE
    const { getByText } = renderWithProvider(
      <PredictMarketCard market={mockMarket} onPress={mockOnPress} />,
    );

    // ACT (none needed)

    // ASSERT
    expect(getByText('65%')).toBeTruthy();
  });

  it('calls onPress when card is tapped', () => {
    // ARRANGE
    const { getByTestId } = renderWithProvider(
      <PredictMarketCard market={mockMarket} onPress={mockOnPress} />,
    );

    // ACT
    fireEvent.press(getByTestId('predict-market-card'));

    // ASSERT
    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockMarket.id);
  });
});
```

### Mocking Patterns

```tsx
// Mocking hooks
jest.mock('../hooks/usePredictMarket', () => ({
  usePredictMarket: jest.fn(() => ({
    market: mockMarket,
    loading: false,
    error: null,
  })),
}));

// Mocking selectors
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector) => {
    if (selector === selectPredictBalanceByAddress) {
      return '1000.00';
    }
    return undefined;
  }),
}));

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  (usePredictMarket as jest.Mock).mockReturnValue({
    market: mockMarket,
    loading: false,
    error: null,
  });
});
```

---

## Migration Examples

### StyleSheet → Tailwind Migration

**BEFORE** (Legacy Pattern):

```tsx
// PredictPosition.tsx
import { View, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#24272A',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#6A737D',
  },
  profit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#28A745',
  },
  loss: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D73A49',
  },
});

const PredictPosition = ({ position }) => {
  const isProfit = position.pnl >= 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{position.marketTitle}</Text>
      <View>
        <Text style={styles.value}>${position.value}</Text>
        <Text style={isProfit ? styles.profit : styles.loss}>
          {isProfit ? '+' : ''}
          {position.pnl}%
        </Text>
      </View>
    </View>
  );
};
```

**AFTER** (Design System + Tailwind):

```tsx
// PredictPosition.tsx
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';

const PredictPosition = ({ position }: { position: PredictPosition }) => {
  const tw = useTailwind();
  const isProfit = position.pnl >= 0;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="p-4 bg-default rounded-xl mb-2"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.SemiBold}
        twClassName="flex-1 text-primary"
      >
        {position.marketTitle}
      </Text>
      <Box alignItems={BoxAlignItems.End}>
        <Text variant={TextVariant.BodySm} twClassName="text-muted">
          ${position.value}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          twClassName={isProfit ? 'text-success-default' : 'text-error-default'}
        >
          {isProfit ? '+' : ''}
          {position.pnl}%
        </Text>
      </Box>
    </Box>
  );
};
```

### Component Extraction Migration

**BEFORE** (1,391-line monolith with inline render functions):

```tsx
// PredictMarketDetails.tsx (BEFORE - abbreviated)

const PredictMarketDetails = () => {
  // 30+ hooks...

  const renderHeader = () => (
    <View style={styles.header}>{/* 50+ lines of header JSX */}</View>
  );

  const renderChart = () => (
    <View style={styles.chart}>{/* 100+ lines of chart JSX */}</View>
  );

  const renderOutcomes = () => (
    <View style={styles.outcomes}>{/* 150+ lines of outcomes JSX */}</View>
  );

  const renderPositions = () => (
    <View style={styles.positions}>{/* 100+ lines of positions JSX */}</View>
  );

  const renderActions = () => (
    <View style={styles.actions}>{/* 80+ lines of actions JSX */}</View>
  );

  return (
    <ScrollView>
      {renderHeader()}
      {renderChart()}
      {renderOutcomes()}
      {renderPositions()}
      {renderActions()}
    </ScrollView>
  );
};
```

**AFTER** (Decomposed structure):

```
views/PredictMarketDetails/
├── PredictMarketDetails.tsx          # <500 lines, orchestration only
├── PredictMarketDetails.test.tsx
├── components/
│   ├── Header/
│   │   ├── Header.tsx                # Memoized, <100 lines
│   │   ├── Header.test.tsx
│   │   └── index.ts
│   ├── Chart/
│   │   ├── Chart.tsx                 # Memoized, <150 lines
│   │   ├── Chart.test.tsx
│   │   └── index.ts
│   ├── Outcomes/
│   │   ├── Outcomes.tsx              # Memoized, <200 lines
│   │   ├── Outcomes.test.tsx
│   │   └── index.ts
│   ├── Positions/
│   │   ├── Positions.tsx             # Memoized, <150 lines
│   │   ├── Positions.test.tsx
│   │   └── index.ts
│   └── Actions/
│       ├── Actions.tsx               # Memoized, <100 lines
│       ├── Actions.test.tsx
│       └── index.ts
└── index.ts
```

```tsx
// PredictMarketDetails.tsx (AFTER)

import React from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@metamask/design-system-react-native';

import { Header } from './components/Header';
import { Chart } from './components/Chart';
import { Outcomes } from './components/Outcomes';
import { Positions } from './components/Positions';
import { Actions } from './components/Actions';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { PredictMarketDetailsSkeleton } from './PredictMarketDetailsSkeleton';

const PredictMarketDetails = ({ route }) => {
  const { marketId } = route.params;
  const { market, loading, error } = usePredictMarket(marketId);

  if (loading) return <PredictMarketDetailsSkeleton />;
  if (error || !market) return <PredictMarketDetailsError error={error} />;

  return (
    <Box twClassName="flex-1 bg-default">
      <ScrollView>
        <Header market={market} />
        <Chart market={market} />
        <Outcomes market={market} />
        <Positions market={market} />
      </ScrollView>
      <Actions market={market} />
    </Box>
  );
};

export default PredictMarketDetails;
```

---

## Anti-Patterns to Avoid

### ❌ NEVER: Import tw from twrnc directly

```tsx
// ❌ WRONG
import tw from 'twrnc';

// ✅ CORRECT
import { useTailwind } from '@metamask/design-system-twrnc-preset';
const tw = useTailwind();
```

### ❌ NEVER: Use StyleSheet.create()

```tsx
// ❌ WRONG
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' }
});
<View style={styles.container}>

// ✅ CORRECT
<Box twClassName="p-4 bg-default">
```

### ❌ NEVER: Use raw View/Text components

```tsx
// ❌ WRONG
import { View, Text } from 'react-native';
<View>
  <Text>Hello</Text>
</View>;

// ✅ CORRECT
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
<Box>
  <Text variant={TextVariant.BodyMd}>Hello</Text>
</Box>;
```

### ❌ NEVER: Use arbitrary color values

```tsx
// ❌ WRONG
<Box twClassName="bg-[#3B82F6]">
<Box style={{ backgroundColor: '#FF0000' }}>
<Text style={{ color: '#24272A' }}>

// ✅ CORRECT
<Box twClassName="bg-primary-default">
<Box backgroundColor={BoxBackgroundColor.PrimaryDefault}>
<Text twClassName="text-primary">
```

### ❌ NEVER: Suppress type errors

```tsx
// ❌ WRONG
const value = data as any;
// @ts-ignore
// @ts-expect-error

// ✅ CORRECT
const value: ExpectedType = data;
// Or create proper type guards
if (isExpectedType(data)) {
  // data is now typed correctly
}
```

### ❌ NEVER: Leave empty catch blocks

```tsx
// ❌ WRONG
try {
  await operation();
} catch (e) {}

// ✅ CORRECT
try {
  await operation();
} catch (error) {
  const e = ensureError(error);
  Logger.error(e, { operation: 'operationName' });
  // Handle error appropriately
}
```

### ❌ NEVER: Pass styles through multiple component layers (prop drilling)

```tsx
// ❌ WRONG - Prop drilling
<Parent scrollHandler={scrollHandler} headerHeight={headerHeight}>
  <Child scrollHandler={scrollHandler} headerHeight={headerHeight}>
    <GrandChild scrollHandler={scrollHandler} headerHeight={headerHeight} />
  </Child>
</Parent>

// ✅ CORRECT - Use Context
<FeedProvider scrollHandler={scrollHandler} headerHeight={headerHeight}>
  <Parent>
    <Child>
      <GrandChild /> {/* Uses useFeedContext() hook */}
    </Child>
  </Parent>
</FeedProvider>
```

### ❌ NEVER: Create large monolithic components

```tsx
// ❌ WRONG - 1000+ line component with inline render functions
const HugeComponent = () => {
  const renderSection1 = () => {
    /* 100 lines */
  };
  const renderSection2 = () => {
    /* 150 lines */
  };
  const renderSection3 = () => {
    /* 200 lines */
  };
  // ... more render functions

  return (
    <View>
      {renderSection1()}
      {renderSection2()}
      {renderSection3()}
    </View>
  );
};

// ✅ CORRECT - Decomposed into focused components
const OrchestrationComponent = () => {
  return (
    <Box>
      <Section1 />
      <Section2 />
      <Section3 />
    </Box>
  );
};
```

---

## App-Level Providers

### PredictProvider Pattern

The `PredictProvider` handles global event subscriptions that need to persist across navigation.

```typescript
// context/PredictProvider/PredictProvider.tsx

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { TransactionMeta, TransactionStatus } from '@metamask/transaction-controller';

interface PredictEvent {
  transactionMeta: TransactionMeta;
  timestamp: number;
}

interface PredictContextValue {
  subscribeToTransactionEvents: (
    callback: (event: PredictEvent) => void
  ) => () => void;
}

const PredictContext = createContext<PredictContextValue | null>(null);

export const usePredictContext = () => {
  const context = useContext(PredictContext);
  if (!context) {
    throw new Error('usePredictContext must be used within PredictProvider');
  }
  return context;
};

export const PredictProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const subscribersRef = useRef<Set<(event: PredictEvent) => void>>(new Set());

  // Subscribe to TransactionController events ONCE at app level
  useEffect(() => {
    const handleTransactionUpdate = ({ transactionMeta }: { transactionMeta: TransactionMeta }) => {
      // Check if this is a Predict transaction
      const isPredictTx = [
        'predictDeposit',
        'predictWithdraw',
        'predictClaim',
      ].includes(transactionMeta.type as string);

      if (isPredictTx) {
        const event: PredictEvent = {
          transactionMeta,
          timestamp: Date.now(),
        };
        // Notify all subscribers
        subscribersRef.current.forEach((callback) => callback(event));
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionUpdate,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionUpdate,
      );
    };
  }, []);

  const subscribeToTransactionEvents = useCallback(
    (callback: (event: PredictEvent) => void) => {
      subscribersRef.current.add(callback);
      return () => {
        subscribersRef.current.delete(callback);
      };
    },
    [],
  );

  return (
    <PredictContext.Provider value={{ subscribeToTransactionEvents }}>
      {children}
    </PredictContext.Provider>
  );
};
```

### usePredictQuery Pattern (Lightweight React Query)

The `usePredictQuery` hook provides React Query-compatible data fetching with caching.

```typescript
// context/PredictQueryProvider/usePredictQuery.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePredictQueryClient } from './PredictQueryProvider';

interface UsePredictQueryOptions<TData> {
  queryKey: unknown[];
  queryFn: () => Promise<TData>;
  staleTime?: number; // ms until data is stale (default: 0)
  enabled?: boolean; // whether to fetch (default: true)
}

interface UsePredictQueryResult<TData> {
  data: TData | undefined;
  error: Error | null;
  isLoading: boolean; // First load, no data yet
  isFetching: boolean; // Any fetch in progress
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
}

export function usePredictQuery<TData>({
  queryKey,
  queryFn,
  staleTime = 0,
  enabled = true,
}: UsePredictQueryOptions<TData>): UsePredictQueryResult<TData> {
  const queryClient = usePredictQueryClient();
  const queryKeyString = JSON.stringify(queryKey);

  const [data, setData] = useState<TData | undefined>(() =>
    queryClient.getQueryData<TData>(queryKey),
  );
  const [error, setError] = useState<Error | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const isMountedRef = useRef(true);

  const fetch = useCallback(async () => {
    if (!enabled) return;

    // Check if data is fresh
    const cached = queryClient.getQueryState(queryKey);
    if (cached && Date.now() - cached.dataUpdatedAt < staleTime) {
      setData(cached.data as TData);
      return;
    }

    // Check for in-flight request (deduplication)
    const existingPromise = queryClient.getInFlightRequest(queryKey);
    if (existingPromise) {
      try {
        const result = await existingPromise;
        if (isMountedRef.current) {
          setData(result as TData);
        }
      } catch (e) {
        if (isMountedRef.current) {
          setError(e as Error);
        }
      }
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const promise = queryFn();
      queryClient.setInFlightRequest(queryKey, promise);

      const result = await promise;

      queryClient.setQueryData(queryKey, result);
      queryClient.clearInFlightRequest(queryKey);

      if (isMountedRef.current) {
        setData(result);
        setIsFetching(false);
      }
    } catch (e) {
      queryClient.clearInFlightRequest(queryKey);

      if (isMountedRef.current) {
        setError(e as Error);
        setIsFetching(false);
      }
    }
  }, [queryKeyString, queryFn, enabled, staleTime, queryClient]);

  useEffect(() => {
    isMountedRef.current = true;
    fetch();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetch]);

  const isLoading = isFetching && data === undefined;
  const isError = error !== null;
  const isSuccess = data !== undefined && !isError;

  return {
    data,
    error,
    isLoading,
    isFetching,
    isError,
    isSuccess,
    refetch: fetch,
  };
}
```

### PredictQueryClient Pattern

```typescript
// context/PredictQueryProvider/PredictQueryClient.ts

interface CacheEntry<T = unknown> {
  data: T;
  dataUpdatedAt: number;
}

interface QueryState<T = unknown> {
  data: T;
  dataUpdatedAt: number;
}

export class PredictQueryClient {
  private cache = new Map<string, CacheEntry>();
  private inFlightRequests = new Map<string, Promise<unknown>>();
  private subscribers = new Map<string, Set<() => void>>();

  private hash(queryKey: unknown[]): string {
    return JSON.stringify(queryKey);
  }

  getQueryData<T>(queryKey: unknown[]): T | undefined {
    return this.cache.get(this.hash(queryKey))?.data as T | undefined;
  }

  setQueryData<T>(queryKey: unknown[], data: T): void {
    const key = this.hash(queryKey);
    this.cache.set(key, {
      data,
      dataUpdatedAt: Date.now(),
    });
    // Notify subscribers
    this.subscribers.get(key)?.forEach((cb) => cb());
  }

  getQueryState(queryKey: unknown[]): QueryState | undefined {
    return this.cache.get(this.hash(queryKey));
  }

  getInFlightRequest(queryKey: unknown[]): Promise<unknown> | undefined {
    return this.inFlightRequests.get(this.hash(queryKey));
  }

  setInFlightRequest(queryKey: unknown[], promise: Promise<unknown>): void {
    this.inFlightRequests.set(this.hash(queryKey), promise);
  }

  clearInFlightRequest(queryKey: unknown[]): void {
    this.inFlightRequests.delete(this.hash(queryKey));
  }

  invalidateQueries(filters?: { queryKey?: unknown[] }): void {
    if (filters?.queryKey) {
      const prefix = this.hash(filters.queryKey);
      for (const [key] of this.cache) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

---

## Verification Commands

### Before Committing

```bash
# Run lint
yarn lint -- app/components/UI/Predict/

# Run type check
yarn lint:tsc

# Run tests for changed files
yarn jest app/components/UI/Predict/<path-to-component>/

# Verify no StyleSheet in migrated files
grep -r "StyleSheet.create" app/components/UI/Predict/components/<ComponentName>/

# Verify file line counts (for decomposed components)
wc -l app/components/UI/Predict/views/<ViewName>/<ViewName>.tsx
```

### After Completing a Task

```bash
# Full verification
yarn lint && yarn lint:tsc && yarn jest app/components/UI/Predict/
```

---

## Related Documents

- [Architecture Overview](./architecture-overview.md) - Current vs target architecture
- [Refactoring Tasks](./refactoring-tasks.md) - Task breakdown with progress tracking
- [UI Development Guidelines](../../.cursor/rules/ui-development-guidelines.mdc) - MetaMask-wide UI patterns
- [Unit Testing Guidelines](../../.cursor/rules/unit-testing-guidelines.mdc) - Testing best practices
