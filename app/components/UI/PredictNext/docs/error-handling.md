# PredictNext Error Handling

## Design Principle: Define Errors Out of Existence

PredictNext follows the principle from _A Philosophy of Software Design_: the best error is the one users never need to experience. Services should absorb transient failures whenever possible.

That means:

- retry temporary transport failures automatically
- reconnect live channels without surfacing modal errors
- fall back to cached data when it remains useful
- surface only errors that require a user decision or action

Related docs:

- [interface ledger](./interface-ledger.md)
- [state management](./state-management.md)
- [hooks](./hooks.md)
- [components](./components.md)
- [testing](./testing.md)

## PredictError Class

User-actionable failures are represented by a single structured error type.

```typescript
type PredictErrorCategory =
  | 'empty_state'
  | 'unavailable'
  | 'action_failed'
  | 'degraded';

interface PredictErrorInput {
  code: PredictErrorCode;
  message: string;
  recoverable: boolean;
  category: PredictErrorCategory;
  metadata?: Record<string, unknown>;
  cause?: unknown;
}

export class PredictError extends Error {
  public readonly code: PredictErrorCode;
  public readonly recoverable: boolean;
  public readonly category: PredictErrorCategory;
  public readonly metadata?: Record<string, unknown>;
  public readonly cause?: unknown;

  constructor(input: PredictErrorInput) {
    super(input.message);
    this.name = 'PredictError';
    this.code = input.code;
    this.recoverable = input.recoverable;
    this.category = input.category;
    this.metadata = input.metadata;
    this.cause = input.cause;
  }

  /**
   * Construct a PredictError from a known code. `category`, `recoverable`,
   * and `message` come from the canonical registry below — services do NOT
   * hand-author these per call site. Pass an overrides object only for the
   * fields that need to differ (typically `metadata` and `cause`).
   */
  static from(
    codeOrError: PredictErrorCode | unknown,
    overrides?: Partial<Omit<PredictErrorInput, 'code'>>,
  ): PredictError {
    if (codeOrError instanceof PredictError) {
      return codeOrError;
    }

    if (!isPredictErrorCode(codeOrError)) {
      // Unknown thrown value — wrap as UNKNOWN.
      return PredictError.from(PredictErrorCode.UNKNOWN, {
        cause: codeOrError,
      });
    }

    const registryEntry = PREDICT_ERROR_REGISTRY[codeOrError];
    return new PredictError({
      code: codeOrError,
      category: registryEntry.category,
      recoverable: registryEntry.recoverable,
      message: overrides?.message ?? registryEntry.defaultMessage,
      metadata: overrides?.metadata,
      cause: overrides?.cause,
    });
  }
}
```

### Canonical error registry

Every `PredictErrorCode` has exactly one entry in a canonical registry that defines its `category`, `recoverable` flag, and default user-facing message. **Services choose the code and attach context; they do not hand-author `category` or `recoverable`.** This single registry is the source of truth — drift between services is impossible because there is only one place to author the mapping.

```typescript
interface PredictErrorRegistryEntry {
  category: PredictErrorCategory;
  recoverable: boolean;
  defaultMessage: string;
}

export const PREDICT_ERROR_REGISTRY: Record<
  PredictErrorCode,
  PredictErrorRegistryEntry
> = {
  [PredictErrorCode.GEO_BLOCKED]: {
    category: 'unavailable',
    recoverable: false,
    defaultMessage: 'Predict is not available in your region.',
  },
  [PredictErrorCode.FEATURE_DISABLED]: {
    category: 'unavailable',
    recoverable: false,
    defaultMessage: 'Predict is currently disabled.',
  },
  [PredictErrorCode.NETWORK_MISMATCH]: {
    category: 'unavailable',
    recoverable: true,
    defaultMessage: 'Switch to the Polygon network to continue.',
  },
  [PredictErrorCode.VENUE_UNAVAILABLE]: {
    category: 'degraded',
    recoverable: true,
    defaultMessage: 'The prediction market venue is temporarily unavailable.',
  },
  [PredictErrorCode.INSUFFICIENT_FUNDS]: {
    category: 'action_failed',
    recoverable: true,
    defaultMessage: 'Not enough balance to place this order.',
  },
  [PredictErrorCode.ORDER_REJECTED]: {
    category: 'action_failed',
    recoverable: true,
    defaultMessage: 'The venue rejected this order.',
  },
  [PredictErrorCode.ORDER_PREVIEW_EXPIRED]: {
    category: 'action_failed',
    recoverable: true,
    defaultMessage: 'The order preview expired. Try again.',
  },
  [PredictErrorCode.ORDER_PLACEMENT_FAILED]: {
    category: 'action_failed',
    recoverable: true,
    defaultMessage: 'Order placement failed.',
  },
  [PredictErrorCode.DEPOSIT_FAILED]: {
    category: 'action_failed',
    recoverable: true,
    defaultMessage: 'Deposit failed.',
  },
  [PredictErrorCode.WITHDRAWAL_FAILED]: {
    category: 'action_failed',
    recoverable: true,
    defaultMessage: 'Withdrawal failed.',
  },
  [PredictErrorCode.CLAIM_FAILED]: {
    category: 'action_failed',
    recoverable: true,
    defaultMessage: 'Claim failed.',
  },
  [PredictErrorCode.TRANSACTION_REJECTED]: {
    category: 'action_failed',
    recoverable: true,
    defaultMessage: 'Transaction rejected.',
  },
  [PredictErrorCode.TRANSACTION_FAILED]: {
    category: 'action_failed',
    recoverable: true,
    defaultMessage: 'Transaction failed.',
  },
  [PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY]: {
    category: 'unavailable',
    recoverable: false,
    defaultMessage: 'This venue does not support that operation.',
  },
  [PredictErrorCode.SERVICE_DEGRADED]: {
    category: 'degraded',
    recoverable: true,
    defaultMessage: 'Predict is currently running in a degraded mode.',
  },
  [PredictErrorCode.RATE_LIMITED]: {
    category: 'degraded',
    recoverable: true,
    defaultMessage: 'Too many requests. Please wait a moment.',
  },
  [PredictErrorCode.LIVE_DATA_DISCONNECTED]: {
    category: 'degraded',
    recoverable: true,
    defaultMessage: 'Live updates temporarily unavailable.',
  },
  [PredictErrorCode.UNKNOWN]: {
    category: 'degraded',
    recoverable: true,
    defaultMessage: 'Predict is temporarily unavailable.',
  },
};
```

`PredictErrorCode`, `PredictErrorCategory`, the registry, and the constructor shape are canonicalised in [interface-ledger.md](./interface-ledger.md). Do not use positional constructor arguments. Prefer `PredictError.from(code, { metadata, cause })` over the bare `new PredictError({...})` constructor — the registry guarantees consistent category and recoverable values across the codebase.

Why a single error type plus a registry helps:

- UI code branches on `category` first and `code` second, instead of raw transport errors
- logging and analytics get structured codes
- service layers can transform diverse backend failures into a small action model
- `category` and `recoverable` never drift between modules — they live in one place

## Four UI Error Categories

| Category      | Trigger                                                  | UI Treatment                                         | Example                              |
| ------------- | -------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| Empty state   | Query returns no data                                    | Empty state component with illustration and guidance | No events found, no positions        |
| Unavailable   | Geo-block, feature disabled, wrong network               | Redirect or present `UnavailableModal`               | User in restricted region            |
| Action failed | Order, claim, or deposit fails after user action         | Inline error with retry affordance                   | Exchange rejects an order            |
| Degraded      | Live data or freshness is reduced but app remains usable | Subtle banner or status pill                         | WebSocket disconnected, stale prices |

The category model keeps UI behavior predictable and limits bespoke handling. Literal category values are `empty_state`, `unavailable`, `action_failed`, and `degraded`.

## Error Handling by Layer

```text
Layer:      ADAPTER          SERVICE            HOOK           COMPONENT
            ┌──────┐         ┌──────┐          ┌──────┐       ┌──────┐
            │      │         │      │          │      │       │      │
Error:      │ Raw  │────────>│Absorb│────────>│Expose│─────>│Render│
            │throw │  catch  │retry │  throw   │state │ props │ UI   │
            │      │         │wrap  │ Predict  │      │       │state │
            └──────┘         │cache │ Error    └──────┘       └──────┘
                             │fall  │
                             │back  │
                             └──────┘

 Transient failures:    ABSORBED (retry, cache fallback, reconnect)
 User-actionable:       SURFACED as PredictError with code + recoverable
 UI renders:            empty | unavailable | action failed | degraded
```

### Predict Client / Venue Adapter layer

Responsibilities:

- `PredictClient` exposes canonical venue operations to services
- venue adapters perform HTTP or transport calls
- venue adapters parse responses
- venue adapters throw raw errors when requests or parsing fail
- `PredictClient` throws `PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY` only for deterministic client-contract failures when an unsupported capability method is invoked

Rules:

- adapters do not normalize remote, transport, parsing, or venue outage failures into `PredictError`
- services wrap raw client/adapter failures into user-actionable `PredictError` values
- clients may throw `PredictErrorCode.UNSUPPORTED_VENUE_CAPABILITY` when callers ignore `client.capabilities`
- clients/adapters should preserve response context where possible

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
      const client = await this.predictSessionService.getClient(
        params.ownerAddress,
      );
      return await client.submitOrder(params);
    } catch (error) {
      Logger.error(error as Error, 'Predict order placement failed');

      // Note: the service does NOT hand-author category or recoverable.
      // Those come from the registry. Override only message, metadata, cause.
      if (this.isInsufficientFundsError(error)) {
        throw PredictError.from(PredictErrorCode.INSUFFICIENT_FUNDS, {
          cause: error,
        });
      }

      if (this.isExchangeRejection(error)) {
        throw PredictError.from(PredictErrorCode.ORDER_REJECTED, {
          cause: error,
        });
      }

      throw PredictError.from(PredictErrorCode.UNKNOWN, {
        message: 'Predict trading is temporarily unavailable.',
        cause: error,
      });
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
      isUnavailable: trading.orderError?.category === 'unavailable',
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
import { OutcomeButton } from '../components/OutcomeButton';

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
2. client/adapter request fails with a temporary network timeout
3. service retries according to its policy
4. if cached data exists, service returns cached data and logs degradation
5. user continues without a blocking error

Example:

```typescript
async getEvents(params: EventsParams) {
  try {
    return await this.fetchQuery({
      queryKey: ['PredictMarketDataService:getEvents', params],
      queryFn: async () => {
        const ownerAddress = await this.getCurrentOwnerAddress();
        const client = await this.predictSessionService.getClient(ownerAddress);
        return await client.fetchEvents(params);
      },
      policyOptions: {
        retry: 2,
      },
    });
  } catch (error) {
    this.logger.warn('Serving cached Predict events after fetch failure');
    const cached = this.getCachedData<PredictEvent[]>(['PredictMarketDataService:getEvents', params]);

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

1. guard logic evaluates account eligibility and region using feature flags, network state, and the account readiness state slice owned by `PredictSessionService`
2. guard logic identifies restricted geography
3. it throws or returns `PredictErrorCode.GEO_BLOCKED`
4. hook exposes unavailable state
5. view shows `UnavailableModal`

Example:

```typescript
import { PredictError, PredictErrorCode } from '../errors/PredictError';

export function ensurePredictEligible(regionCode: string) {
  if (restrictedRegions.has(regionCode)) {
    throw PredictError.from(PredictErrorCode.GEO_BLOCKED);
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
import { OutcomeButton } from '../components/OutcomeButton';
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
  metadata: Record<string, unknown>,
  analytics: PredictAnalytics, // injected helper, not a service
) {
  Logger.error(error, 'PredictError', {
    ...metadata,
    code: error.code,
    recoverable: error.recoverable,
  });

  analytics.track('Predict Error Encountered', {
    code: error.code,
    recoverable: error.recoverable,
    category: error.category,
    ...metadata,
  });
}
```

## Summary

PredictNext error handling should make transient failures disappear, user-actionable failures consistent, and degraded states calm rather than disruptive. `PredictError` provides the stable contract, services absorb complexity, hooks expose decision-ready state, and components render category-based UX without low-level exception handling.
