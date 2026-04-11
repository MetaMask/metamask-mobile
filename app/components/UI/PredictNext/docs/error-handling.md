# PredictNext Error Handling

## Design Principle: Define Errors Out of Existence

PredictNext follows the principle from _A Philosophy of Software Design_: the best error is the one users never need to experience. Services should absorb transient failures whenever possible.

That means:

- retry temporary transport failures automatically
- reconnect live channels without surfacing modal errors
- fall back to cached data when it remains useful
- surface only errors that require a user decision or action

Related docs:

- [state management](./state-management.md)
- [hooks](./hooks.md)
- [components](./components.md)
- [testing](./testing.md)

## PredictError Class

User-actionable failures are represented by a single structured error type.

```typescript
export enum PredictErrorCode {
  GEO_BLOCKED = 'GEO_BLOCKED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ORDER_REJECTED = 'ORDER_REJECTED',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  SERVICE_DEGRADED = 'SERVICE_DEGRADED',
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  UNKNOWN = 'UNKNOWN',
}

export class PredictError extends Error {
  constructor(
    message: string,
    public readonly code: PredictErrorCode,
    public readonly recoverable: boolean,
  ) {
    super(message);
    this.name = 'PredictError';
  }
}
```

Why a single error type helps:

- UI code branches on stable categories instead of raw transport errors
- logging and analytics get structured codes
- service layers can transform diverse backend failures into a small action model

## Four UI Error Categories

| Category      | Trigger                                                  | UI Treatment                                         | Example                              |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| Empty state   | Query returns no data                                    | Empty state component with illustration and guidance | No events found, no positions        |
| Unavailable   | Geo-block, feature disabled, wrong network               | Redirect or present `UnavailableModal`               | User in restricted region            |
| Action failed | Order, claim, or deposit fails after user action         | Inline error with retry affordance                   | Exchange rejects an order            |
| Degraded      | Live data or freshness is reduced but app remains usable | Subtle banner or status pill                         | WebSocket disconnected, stale prices |

The category model keeps UI behavior predictable and limits bespoke handling.

## Error Handling by Layer

### Adapter Layer

Responsibilities:

- perform HTTP or transport calls
- parse responses
- throw raw errors when requests or parsing fail

Rules:

- adapters never throw `PredictError`
- adapters should preserve response context where possible

Example:

```typescript
export class PolymarketAdapter {
  async fetchEvents(params: Record<string, unknown>) {
    const response = await this.httpClient.get('/events', { params });

    if (!Array.isArray(response.data)) {
      throw new Error('Invalid Gamma API response');
    }

    return response.data.map(this.toPredictEvent);
  }
}
```

### Service Layer

Responsibilities:

- absorb transient failures when possible
- retry with policy controls
- use cached data when safe
- transform user-actionable failures into `PredictError`

Example:

```typescript
import { Logger } from '../../../util/Logger';
import { PredictError, PredictErrorCode } from '../errors/PredictError';

export class TradingService {
  async placeOrder(params: PlaceOrderParams) {
    try {
      return await this.adapter.placeOrder(params);
    } catch (error) {
      Logger.error(error as Error, 'Predict order placement failed');

      if (this.isInsufficientFundsError(error)) {
        throw new PredictError(
          'Not enough balance to place this order.',
          PredictErrorCode.INSUFFICIENT_FUNDS,
          true,
        );
      }

      if (this.isExchangeRejection(error)) {
        throw new PredictError(
          'The exchange rejected this order.',
          PredictErrorCode.ORDER_REJECTED,
          true,
        );
      }

      throw new PredictError(
        'Predict trading is temporarily unavailable.',
        PredictErrorCode.UNKNOWN,
        true,
      );
    }
  }
}
```

### Hook Layer

Responsibilities:

- expose query error states and user-actionable `PredictError`
- translate service state into view-friendly booleans
- avoid low-level error branching in components

Example:

```typescript
import { useMemo } from 'react';
import { useTrading } from './useTrading';
import { PredictErrorCode } from '../errors/PredictError';

export function useOrderErrorState() {
  const trading = useTrading();

  return useMemo(() => {
    return {
      isUnavailable:
        trading.orderError?.code === PredictErrorCode.FEATURE_DISABLED,
      isInsufficientFunds:
        trading.orderError?.code === PredictErrorCode.INSUFFICIENT_FUNDS,
      canRetry: Boolean(trading.orderError?.recoverable),
      message: trading.orderError?.message ?? null,
    };
  }, [trading.orderError]);
}
```

### Component Layer

Responsibilities:

- render the right UI state for the error category
- provide retry or redirect affordances
- avoid `try/catch` in render or event code when hooks already model the state

Example:

```tsx
import React from 'react';
import { Box, Text } from '../../../component-library';
import { OutcomeButton } from '../components/primitives/OutcomeButton';

interface OrderErrorBannerProps {
  message: string;
  canRetry: boolean;
  onRetry: () => void;
}

export function OrderErrorBanner({
  message,
  canRetry,
  onRetry,
}: OrderErrorBannerProps) {
  return (
    <Box testID="predict-order-error-banner" gap={8}>
      <Text color="errorDefault">{message}</Text>
      {canRetry ? (
        <OutcomeButton
          outcome={{ id: 'retry', label: 'Retry' }}
          variant="buy"
          onPress={onRetry}
        />
      ) : null}
    </Box>
  );
}
```

## Error Flow Examples

### 1. Transient API Error: absorbed by the service

Flow:

1. `MarketDataService` requests event data
2. adapter request fails with a temporary network timeout
3. service retries according to its policy
4. if cached data exists, service returns cached data and logs degradation
5. user continues without a blocking error

Example:

```typescript
async getEvents(params: EventsParams) {
  try {
    return await this.fetchQuery({
      queryKey: ['PredictMarketData:getEvents', params],
      queryFn: async () => await this.adapter.fetchEvents(params),
      policyOptions: {
        retry: 2,
      },
    });
  } catch (error) {
    this.logger.warn('Serving cached Predict events after fetch failure');
    const cached = this.getCachedData<PredictEvent[]>(['PredictMarketData:getEvents', params]);

    if (cached) {
      return cached;
    }

    throw error;
  }
}
```

User outcome:

- no blocking error if useful cached data exists
- optional degraded banner if live freshness matters

### 2. Geo-block Error: surfaces as unavailable

Flow:

1. guard service evaluates account eligibility and region
2. guard service identifies restricted geography
3. it throws or returns `PredictErrorCode.GEO_BLOCKED`
4. hook exposes unavailable state
5. view shows `UnavailableModal`

Example:

```typescript
import { PredictError, PredictErrorCode } from '../errors/PredictError';

export class PredictGuardService {
  ensureEligible(regionCode: string) {
    if (this.restrictedRegions.has(regionCode)) {
      throw new PredictError(
        'Predict is not available in your region.',
        PredictErrorCode.GEO_BLOCKED,
        false,
      );
    }
  }
}
```

```tsx
import React from 'react';
import { UnavailableModal } from '../components/UnavailableModal';
import { usePredictGuard } from '../hooks/usePredictGuard';

export function PredictHomeGate() {
  const guard = usePredictGuard();

  if (!guard.isEligible) {
    return (
      <UnavailableModal reason={guard.blockReason ?? 'Predict unavailable'} />
    );
  }

  return null;
}
```

User outcome:

- clear unavailable messaging
- no confusing retry loop

### 3. Order Placement Failure: inline actionable error

Flow:

1. user taps buy in `OrderScreen`
2. `useTrading` calls `TradingService.placeOrder`
3. service maps rejection to `PredictErrorCode.ORDER_REJECTED`
4. hook transitions to `orderState = 'error'`
5. view renders inline error with retry action

Example:

```tsx
import React, { useCallback, useState } from 'react';
import { Box } from '../../../component-library';
import { OrderErrorBanner } from './OrderErrorBanner';
import { OutcomeButton } from '../components/primitives/OutcomeButton';
import { useTrading } from '../hooks/useTrading';

export function OrderScreenActions({
  marketId,
  outcomeId,
}: {
  marketId: string;
  outcomeId: string;
}) {
  const trading = useTrading();
  const [amount] = useState('25');

  const submit = useCallback(async () => {
    await trading.placeOrder({
      marketId,
      outcomeId,
      amount,
      paymentToken: trading.selectedPayment,
    });
  }, [amount, marketId, outcomeId, trading]);

  return (
    <Box gap={12}>
      {trading.orderError ? (
        <OrderErrorBanner
          message={trading.orderError.message}
          canRetry={trading.orderError.recoverable}
          onRetry={submit}
        />
      ) : null}
      <OutcomeButton
        outcome={{ id: outcomeId, label: 'Yes' }}
        variant="buy"
        loading={trading.orderState === 'placing'}
        onPress={() => {
          void submit();
        }}
      />
    </Box>
  );
}
```

User outcome:

- failure is visible and local to the action
- retry is possible when safe

## Degraded States

Degraded states are not blocking errors. They indicate reduced fidelity while preserving utility.

Typical triggers:

- live price socket disconnected
- stale sports score feed
- delayed activity refresh

Recommended treatment:

- non-blocking banner
- subtle status pill on live components
- continue rendering last known good data

Example:

```tsx
import React from 'react';
import { Box, Text } from '../../../component-library';

export function LiveDataStatusBanner({
  status,
}: {
  status: 'connected' | 'reconnecting' | 'disconnected';
}) {
  if (status === 'connected') {
    return null;
  }

  return (
    <Box testID="predict-live-data-status" padding={8}>
      <Text color="warningDefault">
        {status === 'reconnecting'
          ? 'Refreshing live prices…'
          : 'Live prices temporarily unavailable'}
      </Text>
    </Box>
  );
}
```

## Logging and Monitoring

All meaningful failures should be logged before being absorbed or surfaced.

Rules:

- log raw errors close to the failing boundary
- include `PredictError.code` in structured logs and analytics
- track counts and rates, not only stack traces
- distinguish absorbed degradation from user-visible failure

Example:

```typescript
import Logger from '../../../util/Logger';

function logPredictError(
  error: PredictError,
  context: Record<string, unknown>,
) {
  Logger.error(error, 'PredictError', {
    ...context,
    code: error.code,
    recoverable: error.recoverable,
  });

  void Engine.context.Analytics.trackEvent({
    event: 'Predict Error Encountered',
    properties: {
      code: error.code,
      recoverable: error.recoverable,
      ...context,
    },
  });
}
```

## Summary

PredictNext error handling should make transient failures disappear, user-actionable failures consistent, and degraded states calm rather than disruptive. `PredictError` provides the stable contract, services absorb complexity, hooks expose decision-ready state, and components render category-based UX without low-level exception handling.
