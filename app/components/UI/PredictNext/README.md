# PredictNext

Predict integrates prediction market venues like Polymarket and future Kalshi into MetaMask Mobile. Users browse events, place orders on outcomes, and manage positions. The feature also supports depositing and withdrawing funds.

## Architecture Overview

The system uses a four layer architecture. Components sit at the top, followed by hooks. Controllers and services handle the logic. Adapters connect to external protocols.

### Services

Six services manage the domain logic, organized into three canonical shapes (see [docs/services.md §1.5](docs/services.md)). PredictSessionService and TradingService are **Stateful services** (BaseController) that own Redux state slices for session/readiness and the active-order workflow. MarketDataService and PortfolioService are **Read services** (BaseDataService) that own cache-aware reads through shared query descriptors and expose narrow read-model writer interfaces for cache patches. TransactionService and LiveDataService are **Runtime services** — plain classes that own transient lifecycle state in private fields. Each of the six registers as a first-class Engine.context entry. Two helpers — the `predictAnalytics` analytics module and the lifecycle-aware `FundingExecutor` funding primitive — are constructor-injected and are NOT first-class services.

### Composition Root

A stateless PredictController acts as the feature composition root. It exposes only `initialize` and `destroy`, instantiates the service graph during bootstrap, and steps off the hot path. Reads and writes flow directly between hooks and services via the Engine messenger.

### Adapters

Protocol adapters like PolymarketAdapter and the future KalshiAdapter handle external communication.

### Hooks

Hooks are organized by domain in co-located folders with barrel exports. Data hooks are granular — each triggers exactly one query so components only fetch what they need. Imperative hooks (useTrading, useTransactions, useLiveData) remain deep since they manage complex stateful workflows. Domains include events, portfolio, trading, transactions, live-data, navigation, and guard.

### Product UI modules

Product UI modules follow a three tier structure. Primitives like EventCard and OutcomeButton live in `components/`. Widgets like EventFeed and OrderForm live in sibling `widgets/` modules, call hooks, prepare display models such as `EventDisplayModel`, and combine primitives. Views like PredictHome and EventDetails live in `views/` and represent full screens.

## Target Directory Structure

PredictNext is currently in planning/documentation form on this branch. The structure below is the target implementation layout that later migration phases will create incrementally.

```
PredictNext/
├── README.md
├── CONTEXT.md
├── index.ts                          # Public entrypoint
├── docs/
│   ├── architecture.md
│   ├── services.md
│   ├── adapters.md
│   ├── components.md
│   ├── hooks.md
│   ├── testing.md
│   ├── state-management.md
│   ├── error-handling.md
│   └── migration/
│       ├── README.md
│       └── phase-1-*.md
│       └── phase-2-*.md
│       └── phase-3-*.md
│       └── phase-4-*.md
│       └── phase-5-*.md
│       └── phase-6-*.md
│       └── phase-7-*.md
├── compat/                           # Temporary translation layer (deleted in Phase 7)
│   ├── mappers.ts
│   ├── types.ts
│   └── index.ts
├── query-descriptors/                # Internal query keys, stale times, and invalidation families
│   ├── marketData.ts
│   ├── portfolio.ts
│   └── index.ts
├── types/
├── controller/
├── services/
│   ├── trading/
│   ├── market-data/
│   ├── portfolio/
│   ├── transactions/
│   ├── live-data/
│   └── analytics/
├── adapters/
│   ├── types.ts
│   ├── polymarket/
│   └── kalshi/ (future)
├── hooks/
│   ├── events/
│   ├── portfolio/
│   ├── trading/
│   ├── transactions/
│   ├── live-data/
│   ├── navigation/
│   └── guard/
├── components/
│   ├── EventCard/
│   ├── OutcomeButton/
│   ├── PositionCard/
│   ├── PriceDisplay/
│   ├── Scoreboard/
│   ├── Chart/
│   └── Skeleton/
├── widgets/
│   ├── EventFeed/
│   ├── FeaturedCarousel/
│   ├── PortfolioSection/
│   ├── OrderForm/
│   └── ActivityList/
├── views/
│   ├── PredictHome/
│   ├── EventDetails/
│   ├── OrderScreen/
│   └── TransactionsView/
├── routes/
├── selectors/
├── constants/
└── utils/
```

## Public Entrypoint

The `index.ts` file defines the public entrypoint. Its allowlist is owned by [docs/interface-ledger.md](docs/interface-ledger.md): views for navigation, selected primitives for embedding, public hooks, selectors, types, and errors. Internal modules like services, adapters, compat, and widgets remain private. Top-level folders are organizational modules, not automatic public interfaces.

## Design Principles

Modules are deep with slim interfaces. We use compound components similar to the Vercel style. Read services extend BaseDataService. We define errors out of existence. The team uses the shared PredictNext context glossary for consistent product language.

## Documentation Index

- [Architecture](docs/architecture.md)
- [Interface Ledger](docs/interface-ledger.md)
- [Services](docs/services.md)
- [Adapters](docs/adapters.md)
- [Components](docs/components.md)
- [Hooks](docs/hooks.md)
- [Testing](docs/testing.md)
- [State Management](docs/state-management.md)
- [Error Handling](docs/error-handling.md)
- [Migration](docs/migration/README.md)

## Migration Status

This branch currently refines the PredictNext architecture and migration plan. Implementation should start only after the foundational contracts are agreed. The feature will be built using an inside-out migration from the original Predict directory: the new adapter and services replace internals first while the old UI stays unchanged, then UI migrates as vertical slices. Check the [migration documentation](docs/migration/README.md) for details.
