# PredictNext module structure

PredictNext uses feature/domain-first ownership for product UI and preserves cross-feature architectural layers where they already have clear ownership. The directory tree grows with implemented vertical slices; diagrams in this document are not scaffolding requirements.

## Current shape

```text
PredictNext/
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

The boundary exports only APIs that callers are supported in depending on. Avoid barrels at every directory level and a catch-all PredictNext root barrel. PRED-1374 now identifies verified external consumers and proposed feature APIs in [the public API contract](./public-api-contract.md); owning implementation tickets introduce those exports, not this design task.

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

## External API and private legacy ownership

PRED-1340 explicitly authorizes compatibility for external consumers. Proposed public owners are `discovery`, `portfolio`, `activity`, `navigation`, and `operations`, with canonical value types in `types`. This is an ownership map, not an instruction to create empty directories. See [ADR-0002](./adr/0002-permanent-public-api-private-legacy.md).

Place temporary adaptation under its owner, for example `portfolio/internal/legacy/`. Private wrappers may use legacy components, hooks, controller calls, and authoritative upstream reads. Legacy presentation and internal hooks remain unchanged. External inputs and callback results stay canonical; no external raw-object prop, module-global raw-object sidecar, or requirement to convert all legacy internals. Rehydrate an entity privately by canonical reference when its legacy component needs more data than the public model carries.

Keep the dependency one-way from private PredictNext adaptation to legacy implementation. Do not make legacy internals import the public wrapper or reverse-import Home. If the existing legacy root router would create a cycle, route composition registers the implementation above both owners. Engine factories/messengers, route/provider registration, transaction-pay integration, signing/publish callbacks and completion wiring are named removable composition exceptions. Shared product and confirmation modules are not exceptions.

The deletion test is unchanged external imports, types and behavior when PRED-1356 replaces private legacy implementation. Only those private files and explicit composition wiring disappear. Do not rebuild Polymarket UI in preparation.

## Adding or moving a module

1. Start from the active Jira vertical slice and identify one owner.
2. Move only the files owned by that capability or feature.
3. Add a module `index.ts` only when code outside the module needs a supported API.
4. Route external imports through that API and keep internal imports inside the module.
5. Move colocated tests without changing their behavior.
6. Update this document when the implemented ownership map changes.

Do not create empty feature directories, a `widgets` category, compatibility modules without a verified caller, or broad restricted-import lint rules. Add enforcement only after convention proves insufficient.
