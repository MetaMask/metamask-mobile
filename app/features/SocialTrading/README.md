# Social Trading (prototype)

A feature-flagged, mock-data-only prototype of a social/copy-trading
experience: a trade feed, a trader leaderboard, trader profiles, and a
simulated "copy trade" flow with a local simulated portfolio.

> **Prototype disclaimer**
>
> Everything in this feature is simulated. All traders, trades, prices, and
> returns are fictional fixtures in `data/mockData.ts`. "Copying" a trade
> only records a local in-memory position — no transaction is created,
> nothing is signed, and no funds move. The UI shows a persistent banner
> and per-flow notices stating this.

## Enabling it

The feature is **disabled by default** and has no user-visible entry point.

- Remote flag: `socialTradingPrototypeEnabled` (default `false`, see
  `app/constants/featureFlags.ts` and
  `selectors/socialTradingPrototypeEnabled/`).
- Local override: set `MM_SOCIAL_TRADING_PROTOTYPE_ENABLED=true` in `.js.env`,
  or toggle the flag in the developer Feature Flag Override screen.
- Navigate to `Routes.SOCIAL_TRADING.ROOT` (`SocialTrading`), e.g. from a dev
  entry point or programmatically. The screen is only registered on the main
  stack while the flag is enabled.

## Structure

```
SocialTrading/
├── analytics/events.ts          # Feature-local MetaMetrics events
├── components/
│   ├── TradeCard/               # One simulated trade in a feed
│   ├── CopyTradeSheet/          # Simulated copy confirmation bottom sheet
│   └── views/
│       ├── SocialTradingView/         # Root: banner + feed/leaders/portfolio tabs
│       ├── SocialTradingFeed/
│       ├── SocialTradingLeaderboard/
│       ├── SocialTradingPortfolio/
│       └── SocialTraderProfile/       # Pushed screen (traderId param)
├── context/SocialTradingContext.tsx   # In-memory simulated state (see below)
├── data/mockData.ts                   # Mock fixtures + formatters (data boundary)
├── routes/index.tsx                   # Feature-local native stack
└── selectors/socialTradingPrototypeEnabled/
```

## State choice

Per the feature development guidelines, feature state normally belongs in
Redux or a controller. This prototype intentionally keeps its simulated
state (follows, likes, simulated positions) in a feature-local React
context mounted at the stack root:

- The state is throwaway simulation data with no cross-feature consumers
  and no persistence requirement; it should die with the flow.
- It keeps the prototype's footprint outside `app/features/SocialTrading`
  to a minimum (routes, flag, strings, navigator registration only).

`data/mockData.ts` and `context/SocialTradingContext.tsx` are the seams to
replace when graduating to real services: swap the fixtures for an API
adapter and move state into a Redux slice or controller without touching
the views.

## Graduation checklist (out of scope for the prototype)

- Real trader/trade data source and pagination
- Real copy execution path (confirmations, signing, risk disclosures)
- Persisted state (Redux slice or controller) and E2E tests
- Compliance/legal review of copy-trading UX and copy
