# PredictNext UI component architecture

PredictNext core UI uses composition to keep product variants explicit and reusable without accumulating mode props. Apply this guidance to complex, reusable structures such as Event cards, Event Screens, Market groups, and charts. Keep simple leaf components simple.

## Rules

### Prefer explicit composition

- Compose static structure with `children` rather than `renderHeader`, `renderFooter`, or similar render props.
- Use render callbacks only when a parent must supply item data, as with a virtualized list.
- Let consumers include, omit, and arrange independently useful parts without placeholder widgets.
- Do not hide substantial product structure behind a monolithic component.

### Avoid boolean mode props

Do not grow a core component through combinations such as `isGame`, `showChart`, `showRules`, or `isCompact`. Boolean props remain appropriate for intrinsic platform state such as `disabled`; they are not a variant system.

Create explicit product compositions instead, such as `EventCardStandard` and `EventCardGame`, from shared primitives. Each variant should make its rendered structure and supported actions obvious.

### Use compound components where they earn their cost

A compound API is appropriate when a reusable structure has independently useful parts or sibling parts share state. For example:

```tsx
<EventScreen.Root>
  <EventScreen.Header />
  <EventScreen.Content>
    <MarketList />
    <EventScreen.About />
  </EventScreen.Content>
</EventScreen.Root>
```

When sibling parts need shared state, expose the smallest typed provider contract needed by current callers. Separate it into `state`, `actions`, and presentation metadata where that distinction is useful. The provider owns the state mechanism; presentational parts consume the interface rather than importing product hooks or services.

Do not add context merely to avoid passing one or two ordinary props. Do not create compound namespaces for leaf components that have no meaningful composition.

### Keep product orchestration outside primitives

- Views and React integration select canonical data, run queries, and own product workflows.
- Presentational primitives render canonical values and express user intent through narrow callbacks.
- A chart renderer receives labelled series and presentation state; it does not fetch Kalshi history or choose the active Market.
- Venue DTOs, transport state, and service ownership never enter UI primitives.

### Add only proven seams

Build the parts and variants required by the active vertical slice. Do not create widget registries, universal section schemas, speculative variants, or extension APIs for hypothetical callers.

## Story and review expectations

For each complex core UI story:

- state the intended composition and explicit variants in acceptance criteria;
- reject boolean-prop proliferation and hidden incompatible modes;
- cover the composed public behavior rather than implementation details;
- test that independently interactive regions remain independent;
- preserve accessibility semantics in every composition;
- use MetaMask design-system components and tokens first.

The goal is not to make every component compound. The goal is to make complex product UI flexible through visible composition while leaving simple code simple.

## Ownership and visibility

Composition does not determine project-wide visibility. Public variants belong at their owning feature or domain module boundary; primitives and compound parts used only to implement those variants stay under that module's `internal/` directory. Consumers outside the module import through its deliberate `index.ts` API and never deep-import internal parts. See [`module-structure.md`](./module-structure.md).
