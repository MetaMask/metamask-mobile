# PredictNext State Management

PredictNext chooses state by lifetime, ownership, sensitivity, and recovery requirements. Remote Venue operations add one category the previous design missed: durable backend workflow state.

Service shapes are defined in [services.md §1.5](./services.md#15-service-shapes). Canonical scope and query keys are defined in [interface-ledger.md](./interface-ledger.md).

## State Categories

| Category                    | Owner                                        | Examples                                                                                 | Rules                                                                    |
| --------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Public server read model    | `MarketDataService` (`BaseDataService`)      | Events, Markets, prices                                                                  | Venue-qualified query keys; no wallet/session requirement                |
| Account server read model   | `PortfolioService` (`BaseDataService`)       | Balance, Positions, Activity, open Orders                                                | Keyed by `PredictAccountScope`                                           |
| Service workflow projection | Stateful services (`BaseController`)         | Account Readiness, safe setup/funding references, Active Order workflow                  | Cross-screen reactivity; persist only safe references                    |
| Durable remote operation    | Owned backend                                | Setup progress, idempotency records, Deposit/Withdraw/Order operations, Venue references | Survives app/backend process restart; system of record for remote writes |
| Transient service internals | Runtime/read/stateful service private fields | sockets, in-flight maps, circuit state, abort handles                                    | Never read directly by UI                                                |
| View-local state            | React state/local hooks                      | keypad, tab, search, unsent form input                                                   | Dies with the view; sensitive input is never persisted                   |

```text
React local state
  └─ ephemeral presentation and unsent input

BaseController slices
  └─ safe cross-screen workflow projection

BaseDataService caches
  ├─ public Venue read models
  └─ account-scoped read models

Backend operation store
  └─ durable setup/write/idempotency/reconciliation state

Private service fields
  └─ transient implementation bookkeeping
```

`PredictController` owns no state. It is a composition root.

## Identity and Scope

```typescript
interface PredictUserContext {
  userId: PredictUserId; // opaque, stable, non-PII
  walletAccountId?: PredictWalletAccountId; // canonical CAIP-10 account ID
}

interface PredictAccountScope extends PredictUserContext {
  venueId: PredictVenueId;
}
```

Rules:

- a Predict User is not a wallet address,
- the selected wallet is Funding Wallet or wallet-scoped Venue Account context,
- every market-data key includes `venueId`,
- every portfolio/readiness/workflow key includes `PredictAccountScope`,
- `getPredictAccountScopeKey(scope)` is the only Redux record-key constructor,
- the backend derives authoritative user identity from authentication and never trusts local scope as authorization,
- emails, raw profile IDs, OTP/KYC values, credentials, and signatures never appear in query keys or Redux.

## BaseDataService Integration

### Public market data

```text
useEventList(venueId, params)
  -> marketDataQueries.getEvents(venueId, params)
  -> UI query bridge
  -> PredictMarketDataService:getEvents(venueId, params)
  -> MarketDataService.fetchQuery(descriptor)
  -> VenueAdapterRegistry.get(venueId).marketData.fetchEvents(params)
  -> local Venue API or MetaMask Predict backend
```

Public browsing does not require `PredictSessionService.getClient()` merely to inject an unused session.

### Account-scoped portfolio

```text
useBalance(scope)
  -> portfolioQueries.getBalance(scope)
  -> UI query bridge
  -> PredictPortfolioService:getBalance(scope)
  -> PortfolioService.fetchQuery(descriptor)
  -> PredictSessionService.getClient(scope)
  -> client.portfolio.fetchBalance()
```

### Registration rules

- Read services register in `DATA_SERVICES` and own their internal query clients.
- Hooks use the same descriptor keys through `@metamask/react-data-query`.
- Hooks do not define independent cache policy for service-backed reads.
- Descriptor modules own key shape, scope, stale time, and invalidation family.
- Live/write modules mutate read models only through narrow writer interfaces.

### Example market-data method

```typescript
export class MarketDataService extends BaseDataService {
  readonly name = 'PredictMarketDataService';

  async getEvents(venueId: PredictVenueId, params: FetchEventsParams) {
    const descriptor = marketDataQueries.getEvents(venueId, params);
    const adapter = this.venueAdapterRegistry.get(venueId);

    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      queryFn: () => adapter.marketData.fetchEvents(params),
    });
  }
}
```

### Example portfolio method

```typescript
export class PortfolioService extends BaseDataService {
  readonly name = 'PredictPortfolioService';

  async getBalance(scope: PredictAccountScope) {
    const descriptor = portfolioQueries.getBalance(scope);

    return this.fetchQuery({
      queryKey: descriptor.queryKey,
      staleTime: descriptor.staleTime,
      queryFn: async () => {
        const client = await this.predictSessionService.getClient(scope);
        return client.portfolio.fetchBalance();
      },
    });
  }
}
```

## Redux State Shape

Only state needing cross-component reactivity or safe resume belongs in Redux.

### PredictSessionService

```typescript
interface PredictSessionServiceState {
  readinessByAccount: Record<PredictAccountScopeKey, PredictAccountReadiness>;
  setupByAccount: Record<PredictAccountScopeKey, AccountSetupState>;
  eligibilityByVenue: Partial<Record<PredictVenueId, PredictEligibility>>;
}
```

Persistence:

- readiness: normally non-persistent; refresh from source,
- eligibility: non-persistent unless a safe signed config projection requires otherwise,
- setup projection: persist only a safe backend `operationId`/status when resume requires it,
- never persist form fields, email, OTP, SSN, KYC payloads, API keys, Venue Sessions, or auth tokens.

### TransactionService

```typescript
interface TransactionServiceState {
  operationsByAccount: Record<
    PredictAccountScopeKey,
    FundingOperationProjection[]
  >;
}
```

A projection contains only `operationId`, funding operation kind, canonical status, and `updatedAt`. These safe references may persist so Deposit/Withdraw/Claim can resume across navigation or app restart. Amount, destination, transaction payload, signatures, and Venue details are re-fetched from the authenticated backend and never persist in this slice.

### TradingService

```typescript
type TradingWorkflowState =
  | { status: 'IDLE' }
  | { status: 'PREVIEWING'; scope: PredictAccountScope }
  | { status: 'READY'; scope: PredictAccountScope; preview: OrderPreview }
  | {
      status: 'FUNDING';
      scope: PredictAccountScope;
      preview: OrderPreview;
      fundingOperationId: string;
    }
  | {
      status: 'PLACING_ORDER';
      scope: PredictAccountScope;
      previewId: string;
      idempotencyKey: string;
      operationId?: string;
    }
  | { status: 'SUCCESS'; receipt: OrderReceipt }
  | {
      status: 'ERROR';
      errorCode: PredictErrorCode;
      recoverable: boolean;
      previousState?: Extract<
        TradingWorkflowState,
        { status: 'READY' | 'FUNDING' | 'PLACING_ORDER' }
      >;
    };

interface TradingServiceState {
  workflow: TradingWorkflowState;
  selectedPayment: SelectedPaymentToken | null;
}
```

Uncommitted preview state is non-persistent and may be discarded. Once submit commits, the backend operation is authoritative; mobile reuses its operation/idempotency reference rather than issuing a new Order.

## Durable Backend Operations

Remote Account Setup and write operations require durable state beyond a mobile process.

A backend operation record owns at minimum:

- opaque operation ID,
- authenticated Predict User/Venue Account mapping,
- operation kind and current state,
- idempotency key and request fingerprint,
- external Venue references,
- timestamps/expiry,
- transaction hash when supplied,
- redacted failure/reconciliation status.

It never exposes or logs credential material or raw KYC values.

### Mobile resume rule

- mobile may persist a non-secret operation reference,
- app teardown stops local observation only,
- resume queries the backend operation,
- a repeated local commit request reuses the same backend operation/idempotency key, but the external Venue call repeats only with verified safe semantics,
- a conflicting request with a reused key fails explicitly,
- no local `reset()` implies an external operation was cancelled.

This is required for:

- a Deposit transfer that succeeded before indication failed,
- a Withdraw whose response was lost,
- an Order accepted before mobile timed out,
- interrupted Account Setup or one-time credential minting.

## Query Descriptor Convention

Examples:

```typescript
['PredictMarketDataService:getEvents', venueId, params];
['PredictMarketDataService:getEvent', venueId, eventId];
['PredictMarketDataService:getPrices', venueId, queries];

['PredictPortfolioService:getPositions', scope, params];
['PredictPortfolioService:getBalance', scope];
['PredictPortfolioService:getActivity', scope, cursor];
```

The descriptor object includes:

```typescript
interface PredictQueryDescriptor<TKey extends readonly unknown[]> {
  queryKey: TKey;
  family: readonly unknown[];
  staleTime: number;
  scope: 'venue' | 'account';
}
```

## Stale Time Strategy

Starting policy—not a substitute for product freshness requirements:

| Data            | Initial stale time                | Notes                                           |
| --------------- | --------------------------------- | ----------------------------------------------- |
| Event metadata  | 5 min                             | Venue-qualified                                 |
| Market prices   | 1 min or bounded polling interval | Order submission always revalidates server-side |
| Resolved Events | 1 hour                            | Mostly static                                   |
| Positions       | 1 min                             | Invalidate/reconcile after Fill/Settlement      |
| Balance         | 30 sec                            | Refresh before/after money/order milestones     |
| Activity        | 5 min                             | Fill/Settlement append model                    |
| Open Orders     | short/polled/live                 | Only when Resting Orders are enabled            |

Cached price freshness never authorizes an Order. `previewId` expiry and backend revalidation do.

## Cache Invalidation

Rules:

- after Order submit, patch optimistically only when safe, then invalidate Balance, Positions, Activity, and open Orders for the exact `PredictAccountScope`,
- after Deposit/Withdraw/Claim milestones, invalidate Balance and relevant Activity for the exact scope,
- after Settlement, invalidate Position, Balance, and Activity,
- public market updates invalidate only matching Venue families,
- manual refresh targets one Venue/account scope unless product explicitly asks for all Venues,
- never invalidate by unqualified Event/Market IDs.

Example:

```typescript
await Promise.all([
  queryClient.invalidateQueries({
    queryKey: portfolioQueries.getPositions(scope).family,
  }),
  queryClient.invalidateQueries({
    queryKey: portfolioQueries.getBalance(scope).family,
  }),
  queryClient.invalidateQueries({
    queryKey: portfolioQueries.getActivity(scope).family,
  }),
]);
```

## Live Updates

Live data is optional. Bounded polling may implement Kalshi v1.

When enabled:

- updates include `venueId`,
- account updates include `PredictAccountScope`,
- stable complete updates patch through read-model writer methods,
- uncertain/partial updates invalidate the smallest correct family,
- UI does not maintain a separate overlay,
- out-of-order and duplicate updates are handled at the cache-owning module.

## Where State Belongs — Decision Rule

Apply in order:

1. **Is it a remote irreversible/setup operation?** → durable backend operation; mobile keeps a safe projection/reference only.
2. **Is it fetched public/account data?** → owning Read service query cache with Venue/account scope.
3. **Does a safe projection need cross-component reactivity?** → Stateful service Redux slice.
4. **Is it private lifecycle bookkeeping?** → service private fields.
5. **Does only one view need it?** → local React state.
6. **Is it sensitive input or credential material?** → never Redux/query cache/logs; minimize lifetime and follow the approved secure path.

## Summary

PredictNext state is safe when:

- public data is Venue-scoped,
- account data is `PredictAccountScope`-scoped,
- person identity is distinct from wallet execution,
- read models live in query caches,
- safe workflow projections live in focused Redux slices,
- remote writes and Account Setup have a durable backend system of record,
- transient implementation details stay private,
- sensitive data is never persisted in feature state.
