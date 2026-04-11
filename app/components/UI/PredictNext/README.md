# PredictNext

Predict integrates prediction market platforms like Polymarket and future Kalshi into MetaMask Mobile. Users browse events, place bets on outcomes, and manage positions. The feature also supports depositing and withdrawing funds.

## Architecture Overview

The system uses a four layer architecture. Components sit at the top, followed by hooks. Controllers and services handle the logic. Adapters connect to external protocols.

### Services

Six deep services manage the domain logic. TradingService handles orders. MarketDataService and PortfolioService extend BaseDataService for data fetching. TransactionService tracks on chain activity. LiveDataService provides real time updates. AnalyticsService records user interactions.

### Orchestration

A thin PredictController orchestrates write operations. It delegates tasks to the underlying services.

### Adapters

Protocol adapters like PolymarketAdapter and the future KalshiAdapter handle external communication.

### Hooks

Hooks are organized by domain in co-located folders with barrel exports. Data hooks are granular — each triggers exactly one query so components only fetch what they need. Imperative hooks (useTrading, useTransactions, useLiveData) remain deep since they manage complex stateful workflows. Domains include events, portfolio, trading, transactions, live-data, navigation, and guard.

### Components

Components follow a three tier structure. Primitives like EventCard and OutcomeButton form the base. Widgets like EventFeed and OrderForm combine primitives. Views like PredictHome and EventDetails represent full screens.

## Directory Structure

```
PredictNext/
├── README.md
├── UBIQUITOUS_LANGUAGE.md
├── index.ts                          # Public API
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
│       └── phase-8-*.md
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

## Public API

The index.ts file defines the public API. It exports views for navigation and components for embedding. Hooks for data access, types, and selectors are also available. Internal modules like services and adapters remain private.

## Design Principles

Modules are deep with slim interfaces. We use compound components similar to the Vercel style. Read services extend BaseDataService. We define errors out of existence. The team uses DDD ubiquitous language for consistency.

## Documentation Index

- [Architecture](docs/architecture.md)
- [Services](docs/services.md)
- [Adapters](docs/adapters.md)
- [Components](docs/components.md)
- [Hooks](docs/hooks.md)
- [Testing](docs/testing.md)
- [State Management](docs/state-management.md)
- [Error Handling](docs/error-handling.md)
- [Migration](docs/migration/README.md)

## Migration Status

This feature is being built using a strangler fig migration from the original Predict directory. Check the [migration documentation](docs/migration/README.md) for details.
