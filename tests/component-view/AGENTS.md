# tests/component-view/ — AGENTS.md

Agent index for **component view tests** (`app/**/*.view.test.tsx`). Jest component view tests using the `tests/component-view/` framework. Pointers only; details live in the canonical skill and references below.

---

## Scope

- **component view tests** — `app/**/*.view.test.tsx`. Integration-level tests that test views through real Redux state (no mocked hooks or selectors). Consume the [framework](#framework) (mocks, renderers, presets, state fixture).

---

## Framework {#framework}

The component view test **framework** is the code and conventions in `tests/component-view/`. It provides:

- **Mocks** — Engine and allowed native modules only; import first so they apply before any component code.
- **Render helpers** — `renderComponentViewScreen` and `renderScreenWithRoutes` to mount a view with Redux and (optionally) a navigator.
- **State fixture** — `StateFixtureBuilder` / `createStateFixture()` to build Redux state from a preset and overrides.
- **Presets** — per-feature builders (e.g. `initialStateBridge()`) that produce a valid baseline state.
- **Renderers** — per-feature functions (e.g. `renderBridgeView()`) that combine a preset + overrides and call the render helpers.

Tests **must** use this framework: only Engine and allowed native modules may be mocked; behavior is driven by Redux state; presets and renderers are reused instead of building state from scratch.

### Framework structure {#framework-structure}

```
tests/component-view/
├── mocks.ts              ← Engine + native mocks (import this first, always)
├── render.tsx            ← renderComponentViewScreen, renderScreenWithRoutes
├── stateFixture.ts       ← StateFixtureBuilder, createStateFixture, deepMerge
├── presets/              ← initialState<Feature>() builders — one file per feature
└── renderers/            ← render<Feature>View() functions — one file per feature
```

### Mocks {#framework-mocks}

- **File:** [mocks.ts](mocks.ts)
- **Role:** Mocks for Engine (singleton) and allowed native modules (e.g. `react-native-device-info`). No other `jest.mock` is allowed in `*.view.test.*` (enforced by ESLint and runtime).
- **Usage:** Import at the very first line of every view test and every renderer: `import '<path>/tests/component-view/mocks';`

### Render {#framework-render}

- **File:** [render.tsx](render.tsx)
- **Exports:**
  - `renderComponentViewScreen(Component, { name }, providerValues?, initialParams?)` — Renders a single screen with Redux; used by all feature renderers.
  - `renderScreenWithRoutes(Component, entryRoute, extraRoutes[], providerValues?, initialParams?)` — Renders a stack with extra routes. When a route has no `Component`, the framework renders a probe with `testID={`route-${routeName}`}` so tests can assert navigation with `findByTestId(\`route-${Routes.X}\`)`.

### State fixture {#framework-state-fixture}

- **File:** [stateFixture.ts](stateFixture.ts)
- **Role:** `createStateFixture()` returns a builder with `.withMinimalAccounts()`, `.withMinimalMainnetNetwork()`, `.withOverrides(...)`, etc. Presets use it to build baseline state; tests pass overrides via the renderer.

### Presets {#framework-presets}

- **Directory:** [presets/](presets/)
- **Role:** One preset per feature area (e.g. `presets/bridge.ts` → `initialStateBridge()`). Each returns a builder that composes `createStateFixture()` with feature-specific defaults. Use in renderers and in tests that need a state object (e.g. for `renderScreenWithRoutes(..., { state })`).

### Renderers {#framework-renderers}

- **Directory:** [renderers/](renderers/)
- **Role:** One renderer per feature (e.g. `renderers/bridge.ts` → `renderBridgeView(options)`). Each uses the matching preset, applies overrides, and calls `renderComponentViewScreen` (or `renderScreenWithRoutes` for navigation tests). Tests should call a renderer, not `renderComponentViewScreen` directly, so state stays consistent and reusable.

---

## Canonical skill (Mandatory)

Links to the skill content:

- [.agents/skills/component-view-test/SKILL.md](../../.agents/skills/component-view-test/SKILL.md) — Full workflow, golden rules
- [.agents/skills/component-view-test/references/writing-tests.md](../../.agents/skills/component-view-test/references/writing-tests.md) — Test structure, renderers, presets
- [.agents/skills/component-view-test/references/navigation-mocking.md](../../.agents/skills/component-view-test/references/navigation-mocking.md) — Navigation testing, API mocking
- [.agents/skills/component-view-test/references/reference.md](../../.agents/skills/component-view-test/references/reference.md) — Fiat, run commands, self-review checklist, failure diagnosis

Other harnesses: start prompts with `Follow .agents/skills/component-view-test/SKILL.md`

## Run the tests {#run-the-tests}

Always use `jest.config.view.js` — the default Jest config does not apply component view test rules.

```bash
yarn jest -c jest.config.view.js <path> --runInBand --silent --coverage=false
```

Coverage for a feature folder:

```bash
yarn test:view:coverage:folder app/components/UI/MyFeature
```

For run-by-name, watch mode, or other options, see the skill’s [references/reference.md](../../.agents/skills/component-view-test/references/reference.md) (Run the Tests).

## Enforcement {#enforcement}

- ESLint override in `.eslintrc.js` blocks forbidden `jest.mock` in `*.view.test.*`
- Runtime guard: `app/util/test/testSetupView.js`

## Implementation reference {#implementation-reference}

- Mocks: [mocks.ts](mocks.ts)
- Presets: [presets/](presets/)
- Renderers: [renderers/](renderers/)
- State fixture: [stateFixture.ts](stateFixture.ts)

## Before working

- **component view tests** — No fake timers (`jest.useFakeTimers` / `advanceTimersByTime`); use `waitFor` or real delays. Follow [.agents/skills/component-view-test/SKILL.md](../../.agents/skills/component-view-test/SKILL.md). Only mock Engine and allowed native modules; drive behavior through Redux state; reuse presets and renderers.
