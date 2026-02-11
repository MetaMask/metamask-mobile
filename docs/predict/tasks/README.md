# Live NFL Sports - Implementation Plan

## Overview

This document provides the implementation plan for the Live NFL Sports feature in Prediction Markets. The work is broken into 9 tasks optimized for parallel development across 3 team members.

## Key Architectural Decisions

| Decision               | Choice                                        | Rationale                                                 |
| ---------------------- | --------------------------------------------- | --------------------------------------------------------- |
| WebSocket pattern      | Singleton in PolymarketProvider + GameCache   | Centralized connection management, efficient data overlay |
| State for live data    | Local React state (not Redux)                 | High-frequency updates, not persisted                     |
| Re-render optimization | **Granular subscriptions at component level** | Minimize React tree re-renders                            |
| Gradient               | Simple 20% opacity overlay, 45° angle         | Design system handles theming                             |
| Navigation             | **Single MARKET_DETAILS route**               | Runtime render decision based on market.game              |

## Task Summary

| ID  | Task                          | Est. Hours | Track              | Dependencies   |
| --- | ----------------------------- | ---------- | ------------------ | -------------- |
| 00  | Feature Flag and Data Types   | 2-3        | Foundation         | None           |
| 01  | WebSocket Manager + GameCache | 6-8        | A (Infrastructure) | 00             |
| 02  | Live Data Hooks (granular)    | 4-6        | A (Infrastructure) | 00, 01         |
| 03  | UI Primitives                 | 4-5        | B (Card & Feed)    | 00             |
| 04  | PredictMarketGame Card        | 8-10       | B (Card & Feed)    | 00, 03         |
| 05  | NFL Feed Tab                  | 4-6        | B (Card & Feed)    | 00, 04         |
| 06  | PredictGameChart              | 8-10       | C (Details Screen) | 00, 03         |
| 07  | PredictGamePosition           | 4-6        | C (Details Screen) | 00, 02, 03     |
| 08  | PredictGameDetailsContent     | 10-12      | C (Details Screen) | 00, 02, 06, 07 |

**Total Estimated Effort: 51-66 hours**

## Granular Subscriptions Pattern (CRITICAL)

**DO NOT create composite hooks that aggregate all data.** Each component subscribes to only the data it needs:

| Component                      | Subscribes To                   |
| ------------------------------ | ------------------------------- |
| GameScoreboard                 | `useLiveGameUpdates(gameId)`    |
| PredictGameChart               | `useLiveMarketPrices(tokenIds)` |
| GameDetailsFooter              | `useLiveMarketPrices(tokenIds)` |
| PredictGamePosition (each row) | `useLiveTokenPrice(tokenId)`    |

**Why**: If a parent component subscribed to all data and passed it down, ANY update would re-render the ENTIRE tree. With granular subscriptions, only the affected component re-renders.

## Dependency Graph

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                      Task 00                             │
                    │            Feature Flag & Data Types                     │
                    │                   (Foundation)                           │
                    └──────────────────────────────────────────────────────────┘
                                            │
            ┌───────────────────────────────┼───────────────────────────────┐
            │                               │                               │
            ▼                               ▼                               ▼
    ┌───────────────┐               ┌───────────────┐               ┌───────────────┐
    │   Task 01     │               │   Task 03     │               │   Task 06     │
    │ WebSocket Mgr │               │ UI Primitives │               │  Game Chart   │
    │  (Track A)    │               │  (Track B)    │               │  (Track C)    │
    └───────────────┘               └───────────────┘               └───────────────┘
            │                               │                               │
            ▼                               ▼                               │
    ┌───────────────┐               ┌───────────────┐                       │
    │   Task 02     │               │   Task 04     │                       │
    │ Live Hooks    │               │ Game Card     │                       │
    │  (Track A)    │◄──────────────│  (Track B)    │                       │
    └───────────────┘               └───────────────┘                       │
            │                               │                               │
            │                               ▼                               │
            │                       ┌───────────────┐                       │
            │                       │   Task 05     │                       │
            │                       │ NFL Feed Tab  │                       │
            │                       │  (Track B)    │                       │
            │                       └───────────────┘                       │
            │                                                               │
            │                       ┌───────────────┐                       │
            └──────────────────────►│   Task 07     │◄──────────────────────┘
                                    │ Game Position │
                                    │  (Track C)    │
                                    └───────────────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │   Task 08     │
                                    │ Game Details  │
                                    │  (Track C)    │
                                    └───────────────┘
```

## Developer Assignments

### Developer A - Infrastructure Track

Focus: WebSocket infrastructure and data hooks

| Week | Tasks                     | Hours |
| ---- | ------------------------- | ----- |
| 1    | Task 00 (shared), Task 01 | 8-11  |
| 2    | Task 02                   | 4-6   |

**Total: 12-17 hours**

### Developer B - Card & Feed Track

Focus: Feed UI components and NFL tab

| Week | Tasks                     | Hours |
| ---- | ------------------------- | ----- |
| 1    | Task 00 (shared), Task 03 | 6-8   |
| 2    | Task 04, Task 05          | 12-16 |

**Total: 18-24 hours**

### Developer C - Details Screen Track

Focus: Game details view and related components

| Week | Tasks            | Hours |
| ---- | ---------------- | ----- |
| 1    | Task 06          | 8-10  |
| 2    | Task 07, Task 08 | 14-18 |

**Total: 22-28 hours**

## Parallel Execution Strategy

### Week 1 - Foundation & Core Components

**All developers** start with **Task 00** (can be done together or split):

- Dev A: Feature flag selector
- Dev B: Game data types
- Dev C: Navigation types

Then diverge:

- **Dev A**: Start Task 01 (WebSocket Manager)
- **Dev B**: Start Task 03 (UI Primitives)
- **Dev C**: Start Task 06 (Game Chart)

### Week 2 - Feature Components

- **Dev A**: Complete Task 02 (Live Hooks)
- **Dev B**: Complete Task 04 (Game Card), then Task 05 (NFL Tab)
- **Dev C**: Complete Task 07 (Game Position), then Task 08 (Details View)

### Week 3 - Integration & Polish

All developers focus on integration testing and bug fixes.

## Critical Path

The critical path (longest sequential dependency chain) is:

```
Task 00 → Task 01 → Task 02 → Task 07 → Task 08
```

This path determines the minimum time to complete the feature. Estimated: **26-35 hours** of sequential work.

## Integration Points

These are moments where work from different tracks must come together:

| Integration    | Tracks    | Description                                                                              |
| -------------- | --------- | ---------------------------------------------------------------------------------------- |
| Card in Feed   | A + B     | Game card (B) uses live prices from hooks (A)                                            |
| Details Screen | A + B + C | Details view (C) uses chart (C), positions (C), live data (A), and routing from card (B) |
| NFL Tab        | B         | Uses existing feed infrastructure, adds new category                                     |

## Testing Strategy

### Unit Tests (Each Task)

- All tasks require unit tests
- Follow AAA pattern
- Mock external dependencies

### Integration Tests (Week 3)

- Card → Details navigation flow
- Live data updates in UI
- Position cash out flow
- Claim flow for ended games

### E2E Tests

- Full user journey: Browse NFL tab → Select game → View details → Place bet → View position

## Risk Mitigation

| Risk                  | Mitigation                                       |
| --------------------- | ------------------------------------------------ |
| WebSocket instability | Robust reconnection logic, graceful degradation  |
| Type mismatches       | Task 00 defines all types upfront, shared review |
| Integration delays    | Clear interfaces defined in task docs            |
| Feature flag issues   | Local fallback with env variable                 |

## Definition of Done

Each task is complete when:

- [ ] All code implemented per task spec
- [ ] Unit tests written and passing
- [ ] No TypeScript errors
- [ ] Code reviewed by peer
- [ ] Feature flag gating verified
- [ ] Dark/light mode tested

## Reference Materials

- **Architecture**: `docs/predict/live-nfl-architecture.md`
- **POC Branch**: `predict/poc-live-nfl` (reference implementation)
- **Designs**: Root directory PNG files
- **Polymarket API**: See Task 01 for WebSocket specs

## Task Files

Detailed specifications for each task:

1. [Task 00 - Feature Flag and Data Types](./00-feature-flag-and-types.md)
2. [Task 01 - WebSocket Manager + GameCache](./01-websocket-manager.md)
3. [Task 02 - Live Data Hooks (Granular)](./02-live-data-hooks.md)
4. [Task 03 - UI Primitives](./03-ui-primitives.md)
5. [Task 04 - PredictMarketGame Card](./04-market-game-card.md)
6. [Task 05 - NFL Feed Tab](./05-nfl-feed-tab.md)
7. [Task 06 - PredictGameChart](./06-game-chart.md)
8. [Task 07 - PredictGamePosition](./07-game-position-component.md)
9. [Task 08 - PredictGameDetailsContent](./08-game-details-view.md)
