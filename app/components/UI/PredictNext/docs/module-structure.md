# PredictNext module structure

PredictNext uses feature/domain-first ownership for product UI and preserves cross-feature architectural layers where they already have clear ownership. The directory tree grows with implemented vertical slices; diagrams in this document are not scaffolding requirements.

## Current shape

```text
PredictNext/
  index.ts                     # Curated external entry point
  implementation/
    index.ts                   # Legacy/next switch and Active Venue resolution
    PredictImplementationSwitch.tsx
    usePredictImplementation.ts
    NextVenueContext.tsx       # The next branch's resolved Venue (useNextVenueId)
  activity/
    index.ts                   # Activity projections for the shared Activity list and details
    usePredictActivityItems.ts # Activity as shared ActivityListItems
    usePredictActivityDetailsItem.ts
    PredictActivityDetails.tsx # Details template for prediction* kinds
    internal/
      legacy/                  # Legacy list hook, mapper and details templates, moved as-is
  events/
    cards/
      index.ts                 # Supported Event-card API
      EventCardGame.tsx        # Public composition
      EventCardStandard.tsx    # Public composition
      internal/                # Card primitives and private composition
    game/
      index.ts                 # Game presentation and Game Selection quotes
      createGamePresentation.ts
      findGameSelectionQuote.ts
      findWinnerMarketQuotes.ts
    markets/
      index.ts                 # Supported Market-card and list API
      MarketList.tsx           # Card-agnostic detail-list composition
      MarketFooterCard.tsx     # Public Game winner footer composition
      MarketStandardCard.tsx   # Public standard Market composition
      SpreadMarketGroupCard.tsx # Public spread Market-group composition
      TotalMarketGroupCard.tsx  # Public total Market-group composition
      internal/                # Private Market-card parts
    shared/
      formatting/              # Price and Volume formatting shared by Event UI

  views/                       # Screen compositions and private view helpers
    PredictEvent/
      internal/                # Screen-owned detail helpers
    PredictPortfolio/
      PredictPortfolioScreen.tsx
      internal/                # Summary, tabs, and empty-state composition
  hooks/                       # Existing cross-screen React query integration
  navigation/
    root/                      # Predict root router (legacy or PredictNext stack)

  capabilities/
    index.ts                   # Venue descriptors, capability hooks and selectors
    surfaceFeedKeys.ts         # The surface section/tab to Feed key table
  contracts/                   # Runtime API contracts
  types/                       # Canonical domain types
  queries/                     # Query descriptors and cache policy
  services/                    # Product services
  adapters/                    # Venue capability implementations
  config/
  selectors/
  errors/
```

This records implemented ownership, not the final inventory. Existing `views/` and `hooks/` remain until a focused change can move a complete feature without mixing behavior changes into relocation.

## Placement rules

### Start with the owner

Place new product UI under the domain or feature that owns it, not in a root technical bucket:

```text
home/
  PredictHome.tsx
  components/HomeEventList.tsx
  hooks/useHomeEvents.ts
```

A component or hook used only by Home stays under `home/`. Do not put it in a root `components/` or `hooks/` directory merely because of its technical type.

Keep contracts, canonical types, queries, services, adapters, configuration, and navigation at their existing architectural boundaries when they genuinely serve multiple features.

### Define deliberate public APIs

Use one `index.ts` at a meaningful module boundary. Consumers outside the module import from that boundary:

```ts
import { EventCardGame, EventCardStandard } from '../../events/cards';
```

The boundary exports only APIs that callers are supported in depending on. Avoid barrels at every directory level. The only root-level file is the curated external entry point described below. It is not a barrel that re-exports modules.

### Keep implementation private

Put implementation used only to build a module's public API under that module's `internal/` directory. Code outside the owning module must not import from `internal/`.

Use `internal/` when visibility is the important distinction. Names such as `parts/` describe contents but do not establish an import boundary. Keep private imports relative and do not create a global `internal/` directory.

Tests stay beside the file or composition they cover. Tests inside a module may import its internal files when those files have meaningful standalone behavior; this does not make those files public.

### Promote reuse only after it exists

Create `shared/ui` or `shared/hooks` only after at least two real feature modules need the same semantic abstraction. Move the abstraction when the second caller appears; do not predict reuse or create empty shared directories.

A public domain component should:

- serve multiple real product surfaces;
- accept canonical, domain-meaningful inputs;
- represent a supported dependency for callers; and
- have an API the team is prepared to maintain independently of its internals.

Internal composability alone does not make a component public.

## External API and the legacy branch

Code outside Predict uses the PredictNext public API described in [the public API contract](./public-api-contract.md) and [ADR-0002](./adr/0002-permanent-public-api-private-legacy.md). During the dual-codebase period, that API is consumer-shaped: availability, entry actions, Predict-owned components, and projections typed in the consumer's own terms. Canonical domain types become public only when every supported Venue can supply them truthfully.

Code outside PredictNext imports only from `app/components/UI/PredictNext/index.ts`. That file names each public export explicitly and grows only when a ticket migrates a real caller. Do not use `export *`. Named composition wiring (Engine service initialization and messengers, navigator registration) is the allowlisted exception. Inside PredictNext, modules keep importing each other through their module-root `index.ts` files.

Every public API chooses its branch through `implementation/`: `usePredictImplementation()` resolves the Active Venue to `legacy` or `next` with its `venueId`, and `<PredictImplementationSwitch legacy next resolving />` mounts only the active branch. That module holds the single Venue-to-implementation map. The `next` branch reads its Venue with `useNextVenueId()`; screens below the entry screen take `venueId` from route params or an Order intent, never from a Venue constant. Put each public API's legacy pass-through under its owning module, for example `portfolio/internal/legacy/`. The public API contract describes the switch pattern for components and hooks. Predict-specific code that currently lives in shared surfaces, such as Homepage Predictions, moves into legacy `Predict/` unchanged, and the PredictNext wrapper renders it. Keep dependencies one-way: legacy code never imports PredictNext public wrappers.

## Adding or moving a module

1. Start from the active Jira vertical slice and identify one owner.
2. Move only the files owned by that capability or feature.
3. Add a module `index.ts` only when code outside the module needs a supported API.
4. Route external imports through that API and keep internal imports inside the module.
5. Move colocated tests without changing their behavior.
6. Update this document when the implemented ownership map changes.

Do not create empty feature directories, a `widgets` category, speculative compatibility modules, or broad restricted-import lint rules. Add enforcement only after convention proves insufficient. External imports of legacy `UI/Predict/` already have. By the end of PRED-1340, an `import-x/no-restricted-paths` fence restricts code outside Predict to the PredictNext entry point plus the named composition allowlist (see the public API contract).
