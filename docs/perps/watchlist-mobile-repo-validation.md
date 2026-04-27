# Perps watchlist — mobile repository validation

This document reflects **what is implemented today** in the MetaMask Mobile repository for **Perps (derivatives) watchlist** behavior: state shape, persistence, UI surfaces, selectors, analytics, and tests. Use it alongside product specs to route engineers and agents to the correct files.

**Note:** The file `WatchList_Technical_Spec_1.md` referenced in the task was not available in the workspace path used for this validation, so this document is grounded entirely in repository code and existing Perps docs under `docs/perps/`.

---

## Scope

| In scope | Out of scope (not found as “watchlist” in this repo) |
|----------|------------------------------------------------------|
| Perps favorites/watchlist: symbols stored per network (mainnet/testnet) | Token/NFT “watchlist” for the main wallet |
| `PerpsController` CRUD + persisted state | Server-side watchlist sync (local-only persistence) |
| Home, market list, market details, homepage/trending, explore tab | Cross-device watchlist APIs |

---

## Architecture (accurate to repo)

### Source of truth

- **Controller:** `PerpsController` in `app/controllers/perps/PerpsController.ts` (published under the TypeScript path alias `@metamask/perps-controller`; see `tsconfig.json` paths).
- **State field:** `watchlistMarkets: { testnet: string[]; mainnet: string[] }`.
- **Network key:** Derived from `state.isTestnet` → `'testnet' | 'mainnet'`. Toggling testnet in the app switches which array reads/writes apply to.
- **Persistence:** `watchlistMarkets` is included in controller `metadata` with `persist: true` (same file as `StateMetadata`), so symbols survive app restarts via the normal Engine persistence pipeline.

### Public controller API

Messenger-exposed actions (see `app/controllers/perps/PerpsController-method-action-types.ts` and `app/controllers/perps/index.ts`):

- `PerpsController:toggleWatchlistMarket` → `toggleWatchlistMarket(symbol: string)`
- `PerpsController:isWatchlistMarket` → `isWatchlistMarket(symbol: string)`
- `PerpsController:getWatchlistMarkets` → `getWatchlistMarkets(): string[]`

### Redux / UI selectors

Low-level selectors (operate on raw `PerpsControllerState`): `app/controllers/perps/selectors.ts`

- `selectWatchlistMarkets(state)` — symbols for **current** network
- `selectIsWatchlistMarket(state, symbol)`

UI-layer reselect wrappers (safe when Engine state is missing): `app/components/UI/Perps/selectors/perpsController/index.ts`

- `selectPerpsWatchlistMarkets` — `string[]`, never throws on partial state
- `createSelectIsWatchlistMarket(symbol)` — factory for a memoized per-symbol boolean

---

## UI surfaces (where watchlist appears)

| Surface | Role |
|---------|------|
| `PerpsHomeView` | Renders `PerpsWatchlistMarkets` with `watchlistMarkets` from `usePerpsHomeData`, passes `source={PERPS_EVENT_VALUE.SOURCE.PERPS_HOME}`. |
| `PerpsWatchlistMarkets` | Presentational horizontal section: header + `FlatList` of `PerpsMarketRowItem`; hidden when `markets.length === 0`. |
| `PerpsTabView` | **Duplicate inline** watchlist block (not the shared `PerpsWatchlistMarkets` component); comment in styles notes this. |
| `usePerpsMarketListView` | “Favorites only” filter: `showFavoritesOnly` filters to symbols in Redux watchlist; initial state can come from `showWatchlistOnly` route param. |
| `PerpsMarketDetailsView` | Star / favorite control: optimistic UI + `Engine.context.PerpsController.toggleWatchlistMarket` + MetaMetrics. |
| `PerpsSection` (homepage) + `PerpsExploreSection` (trending) | `showFavoriteTag` on tiles/cards from `selectPerpsWatchlistMarkets`. |
| `usePerpsTabExploreData` | Joins `allMarkets` with watchlist symbols for explore tab data. |

**Product/docs expectation:** Reusable list components should receive `source` from the parent for analytics consistency — see `docs/perps/perps-review-antipatterns.md` and `docs/perps/perps-metametrics-reference.md`.

---

## Analytics (MetaMetrics)

Event wiring lives with the UI interaction (example: `PerpsMarketDetailsView`).

- Event: `MetaMetricsEvents.PERPS_UI_INTERACTION`
- Interaction: `PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED` (maps to `favorite_toggled` in docs)
- Action: `FAVORITE_MARKET` / `UNFAVORITE_MARKET`
- Properties include `ASSET`, `SOURCE` (e.g. `PERP_ASSET_SCREEN`), `FAVORITES_COUNT` (post-toggle length from `getWatchlistMarkets()`)

Constants: `app/controllers/perps/constants/eventNames.ts` (e.g. `PERPS_HOME_WATCHLIST`, `FAVORITE_TOGGLED`).

Full property reference: `docs/perps/perps-metametrics-reference.md`.

---

## E2E / agentic harness

- Flow definition: `scripts/perps/agentic/teams/perps/flows/market-watchlist.json` (toggle via testID `perps-market-header-favorite-button`).
- TestID constant: `app/components/UI/Perps/Perps.testIds.ts` → `FAVORITE_BUTTON: 'perps-market-header-favorite-button'`.
- Pre-condition helper: `scripts/perps/agentic/teams/perps/pre-conditions.js` → `perps.not_in_watchlist`.

---

## Task breakdown (engineer / agent routing)

Use this as a checklist when extending or debugging watchlist behavior.

### 1. State and business rules

| Task | Location | Notes |
|------|----------|-------|
| Change default watchlist | `getDefaultPerpsControllerState` in `PerpsController.ts` | `watchlistMarkets: { testnet: [], mainnet: [] }`. |
| Change toggle semantics (e.g. cap size, dedupe) | `toggleWatchlistMarket` in `PerpsController.ts` | Today: simple add/remove by symbol string; append on add. |
| Expose new read APIs | `PerpsController.ts` + `PerpsController-method-action-types.ts` + `app/controllers/perps/index.ts` | Follow existing messenger action patterns. |
| Persistence on/off | `metadata.watchlistMarkets` in `PerpsController.ts` | `persist: true` today. |

### 2. Selectors and Redux usage

| Task | Location |
|------|----------|
| Raw controller selectors | `app/controllers/perps/selectors.ts` |
| UI-safe selectors | `app/components/UI/Perps/selectors/perpsController/index.ts` |
| Unit tests for selectors | `app/controllers/perps/selectors.test.ts` |

### 3. Data joining (symbols → `PerpsMarketData[]`)

| Task | Location |
|------|----------|
| Perps home / search filtering | `usePerpsHomeData.ts` — filters `allMarkets` where `watchlistSymbols.includes(market.symbol)` |
| Market list favorites filter | `usePerpsMarketListView.ts` |
| Explore tab | `usePerpsTabExploreData.ts` |
| Homepage carousel ordering | `PerpsSection.tsx` — `usePerpsTrendingCarouselData` merges watchlist markets ahead of trending |

### 4. Presentation components

| Task | Location |
|------|----------|
| Shared watchlist section | `app/components/UI/Perps/components/PerpsWatchlistMarkets/` |
| Home integration | `PerpsHomeView.tsx` |
| Tab explore integration | `PerpsTabView.tsx` (inline) vs `PerpsHomeView` (shared component) — **be aware of two implementations**. |

### 5. Toggle entry point and optimistic UI

| Task | Location |
|------|----------|
| Favorite button + tracking | `PerpsMarketDetailsView.tsx` — `handleWatchlistPress`, `createSelectIsWatchlistMarket`, optimistic state |

### 6. Tests

| Area | Files |
|------|-------|
| Controller watchlist | `app/controllers/perps/PerpsController.test.ts` (`watchlist markets`, `watchlist management`) |
| Component | `PerpsWatchlistMarkets.test.tsx` |
| Home / market list mocks | `PerpsHomeView.test.tsx`, `PerpsMarketListView.test.tsx`, `usePerpsHomeData.test.ts` |

### 7. Documentation (existing)

| Doc | Content |
|-----|---------|
| `docs/perps/perps-screens.md` | Maps `PerpsWatchlistMarkets` to user watchlist |
| `docs/perps/perps-architecture.md` | Lists watchlist in list components |
| `docs/perps/perps-metametrics-reference.md` | Watchlist analytics |
| `docs/perps/perps-agentic-feedback-loop.md` | `perps.not_in_watchlist`, `market-watchlist` flow |
| `docs/perps/perps-refactoring-plan.md` | Mentions extracting watchlist CRUD to a preferences service (planning note, not done) |

---

## Reference snippets (copy-safe patterns)

These mirror production patterns; adjust imports if a file lives outside the Perps UI package.

### Toggle from a screen (Engine + tracking pattern)

Paths below match `PerpsMarketDetailsView.tsx` (adjust relative depth if your file lives elsewhere).

```typescript
import { PERPS_EVENT_PROPERTY, PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';

const { track } = usePerpsEventTracking();

function toggleFavorite(symbol: string, isCurrentlyFavorite: boolean) {
  const controller = Engine.context.PerpsController;
  controller.toggleWatchlistMarket(symbol);
  const watchlistCount = controller.getWatchlistMarkets().length;
  const newState = !isCurrentlyFavorite;

  track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
    [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
      PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
    [PERPS_EVENT_PROPERTY.ACTION_TYPE]: newState
      ? PERPS_EVENT_VALUE.ACTION_TYPE.FAVORITE_MARKET
      : PERPS_EVENT_VALUE.ACTION_TYPE.UNFAVORITE_MARKET,
    [PERPS_EVENT_PROPERTY.ASSET]: symbol,
    [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    [PERPS_EVENT_PROPERTY.FAVORITES_COUNT]: watchlistCount,
  });
}
```

### Read watchlist symbols in a React component

```typescript
import { useSelector } from 'react-redux';
import { selectPerpsWatchlistMarkets } from '../selectors/perpsController'; // adjust path

const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);
const isFavorite = watchlistSymbols.includes('BTC');
```

### Resolve symbols to full market rows (same idea as `usePerpsHomeData`)

```typescript
import { useMemo } from 'react';
import type { PerpsMarketData } from '@metamask/perps-controller';

function useWatchlistRows(
  allMarkets: PerpsMarketData[],
  watchlistSymbols: string[],
): PerpsMarketData[] {
  return useMemo(
    () => allMarkets.filter((m) => watchlistSymbols.includes(m.symbol)),
    [allMarkets, watchlistSymbols],
  );
}
```

### Controller state shape (authoritative excerpt)

The canonical definition is in `PerpsControllerState` and `getDefaultPerpsControllerState`:

```typescript
watchlistMarkets: {
  testnet: string[];
  mainnet: string[];
}
```

Toggle implementation uses `isTestnet` to pick the active key, then immutably updates the array via `this.update((state) => { ... }))`.

---

## Known implementation nuances

1. **Two home/tab UIs:** `PerpsHomeView` uses `PerpsWatchlistMarkets`; `PerpsTabView` inlines a similar watchlist section. Behavior changes may need updates in **both** places for parity.
2. **Symbols only:** Watchlist stores **market symbols** (`string[]`), not full `PerpsMarketData`. UI layers join against streamed/REST market lists; delisted or missing symbols simply do not render a row.
3. **No remote sync:** Persistence is local to the device via controller state persistence, not a backend watchlist service.
4. **Package path:** Imports often use `@metamask/perps-controller`, which resolves to `app/controllers/perps` in this monorepo (see `tsconfig.json`).

---

## Changelog for this document

- **2026-04-23:** Initial validation from `main` / mobile repo structure.
