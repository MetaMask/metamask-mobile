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
      index.ts                 # Game presentation for cards and Event Screen
      createGamePresentation.ts
    markets/
      index.ts                 # Supported Market-card and list API
      MarketList.tsx           # Card-agnostic detail-list composition
      MarketStandardCard.tsx   # Public standard Market composition
      internal/                # Private standard Market-card parts
    shared/
      formatting/              # Price and Volume formatting shared by Event UI

  views/                       # Existing screens awaiting proven feature ownership
  hooks/                       # Existing cross-screen React query integration
  navigation/

  contracts/                   # Runtime API contracts
  types/                       # Canonical domain types
  queries/                     # Query descriptors and cache policy
  services/                    # Product services
  adapters/                    # Venue capability implementations
  controller/                  # Composition and lifecycle
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

The boundary exports only APIs that callers are supported in depending on. Avoid barrels at every directory level and do not create a PredictNext root barrel before stable external consumers require one.

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

## Adding or moving a module

1. Start from the active Jira vertical slice and identify one owner.
2. Move only the files owned by that capability or feature.
3. Add a module `index.ts` only when code outside the module needs a supported API.
4. Route external imports through that API and keep internal imports inside the module.
5. Move colocated tests without changing their behavior.
6. Update this document when the implemented ownership map changes.

Do not create empty feature directories, a `widgets` category, speculative compatibility modules, or broad restricted-import lint rules. Add enforcement only after convention proves insufficient.
