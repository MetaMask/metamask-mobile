# Collectibles module foundation

This branch introduces the Collectibles module, registers `CollectiblesController`
in Engine and exposes one empty `CollectiblesHome` screen from the wallet homepage.
Both the section title and its button open that screen; the header returns to the
wallet. There are no tabs or bottom menu.

## Naming convention

The feature is **Collectibles**, always plural. Use `Collectibles` for class,
component and type prefixes (`CollectiblesController`, `CollectiblesApiDataService`),
`collectibles` for functions, paths, query keys and feature-owned identifiers,
and `COLLECTIBLES` for constants, routes and environment-variable prefixes
(`MM_COLLECTIBLES_*`). The remote feature flag is `collectiblesEnabled`.
Apply this convention to controllers, services, clients, hooks, tests, translations
and documentation. Do not introduce singular feature aliases.

Existing platform NFT terminology and external package, provider or design-source
contracts retain their original names; a module rename must not alter those APIs.
This is a coordinated rename of an unreleased module, not a second controller or
compatibility layer.

## Feature flag

The homepage section and navigator registration use `selectCollectiblesEnabledFlag`.
The version-gated remote flag `collectiblesEnabled` takes priority:

```json
{ "enabled": true, "minimumVersion": "8.15.0" }
```

The shared validator checks the installed native app version. A valid disabled
flag keeps the feature hidden. When the validator returns `undefined` (missing or
invalid flag, or the development remote-flag override), development builds can
fall back to `MM_COLLECTIBLES_ENABLED=true`. Release builds have no local fallback.
Visibility does not depend on the selected account or its network. See the
[shared flag rules](../../../../docs/readme/version-gated-feature-flags.md).

## Controller registration and persistence

`CollectiblesController` extends `BaseController` with an empty state. Engine
creates its messenger and controller, passes `persistedState.CollectiblesController`
(or the default state), and exposes it through `Engine.context` and `Engine.state`.
The standard `getState` action and `stateChanged` event connect it to Redux and
the existing controller storage discovery. Wallet reset calls `clearState`.
Controller state is excluded from exported state logs.

This preserves the standard persistence and restoration wiring. There are no
persisted fields yet: `metadata` is empty, so `EngineService` has nothing to write
to disk. Future state fields must declare their persistence metadata and default
values. Do not introduce a custom storage implementation, immediate disk flush,
or migration from the unreleased Gacha prototype.

Implementation references:

- [Engine initializer](../../../core/Engine/controllers/collectibles-controller/index.ts)
- [Messenger registration](../../../core/Engine/messengers/collectibles-controller-messenger/index.ts)
- [Engine persistence](../../../core/EngineService/EngineService.ts)
- [Controller storage](../../../store/persistConfig/index.ts)

## Module boundary

Code outside `app/components/UI/Collectibles/` imports only the module's public
API, [`index.ts`](index.ts). It exports exactly what callers are supported in
depending on; everything else is private. When a caller needs something new,
add a named export to that file rather than reaching inside.

Two rules follow from it:

- **`index.ts` is a boundary, never a file name.** A module carries its own
  name (`routes.tsx`, `selectors/featureFlags.ts`): a lone file does not
  become `index.ts` just because it sits in its own directory, because that
  makes it unsearchable by name. `index.ts` is reserved for the module entry
  point above and for component directories, where the
  [component scaffold](../../../../.agents/skills/mms-component-scaffold/SKILL.md)
  requires one. Never use `export *` in either: Metro does not tree-shake
  barrels, so importing one symbol evaluates the whole file at startup.
- **Composition wiring is listed, not re-exported.** Engine init, its
  messenger, `Engine.types` and the navigation param list have to reach inside
  the module. They are named in the fence's composition allowlist, so the
  dependency stays visible instead of being hidden behind an export that
  product code could then use by accident.

## Scope for contributors and agents

Keep this foundation limited to registration, persistence wiring, feature gating,
minimal navigation and the homepage entry point. Do not copy the full POC into
this branch. Providers, API clients, data services, mocks, onboarding, pack
artwork, signing, purchases and sales belong to subsequent PRs.

## Validation

Unit tests cover the controller, persisted-state forwarding, messenger, flag,
Engine integration, standard storage discovery and state-log exclusion.
Component-view tests exercise both homepage entry points and back navigation
with real Redux state and navigation on iOS and Android.

```sh
yarn jest app/components/UI/Collectibles/controllers app/components/UI/Collectibles/selectors app/core/Engine/controllers/collectibles-controller app/core/Engine/messengers/collectibles-controller-messenger --runInBand --coverage=false
yarn jest app/core/Engine/Engine.test.ts -t 'matches initial state fixture' --runInBand --coverage=false
yarn jest -c jest.config.view.js app/components/Views/Homepage/Sections/Collectibles --runInBand --coverage=false
```

### Test conventions

Start with the repository's [mobile testing guide](../../../../.agents/skills/mms-mobile-testing/SKILL.md)
and [component-view conventions](../../../../docs/testing/component-view-tests.md).
Apply these rules to Collectibles tests, including its homepage entry outside
the module directory:

- **Translated copy:** use `strings('collectibles.home_section.open_collectibles')`
  from `locales/i18n` when querying localized text, rather than repeating the
  English copy. This keeps tests aligned with translation keys when copy changes.
  Use exported test-ID constants for structural queries.
- **Fresh elements after transitions:** do not hold a `findBy*` result across
  navigation, loading or a state change that can remount the element. Await the
  relevant readiness marker, then press a fresh `getByTestId(...)`. For assertions
  after navigation, use `waitFor(() => expect(screen.getByTestId(...)).toBeOnTheScreen())`.
- **Isolated Engine updates:** use the [Collectibles renderer helpers](../../../../tests/component-view/renderers/collectibles.tsx)
  for simulated controller updates. Preserve other flags and controller fields
  such as `cacheTimestamp`; save the previous Engine state and restore it in
  `finally`, even if an assertion fails. `jest.clearAllMocks()` does not undo
  assignments to `Engine.state`. Isolation must hold between iOS and Android runs.
- **Distinct coverage:** selector logic and the initial flag gate have unit
  coverage. Keep the live kill-switch scenario in component-view tests: first
  show the section, then disable the flag through the Engine-to-Redux update
  path and assert that it disappears without remounting the homepage. Explain
  this distinction rather than duplicating a static visibility test.
- **Accurate test names:** name only conditions explicitly established by the
  fixture and behavior asserted by the test. Do not claim an account or network
  scenario merely because the fixture happens to default to it.

The [homepage entry tests](../../Views/Homepage/Sections/Collectibles/CollectiblesSection.view.test.tsx)
demonstrate these conventions. The [testing skill's component-view rules](../../../../.agents/skills/mms-mobile-testing/references/component-view.md)
also cover localized labels and mock isolation.

### Review evidence

Follow the repository's [Definition of Ready for Review](../../../../docs/readme/ready-for-review.md).
Keep PR descriptions and Gherkin aligned with the actual plural identifiers,
especially `collectiblesEnabled`, `MM_COLLECTIBLES_ENABLED` and `CollectiblesController`.
Document the platform, build type and exact flag setup, including remote-flag
precedence. Report commands and results actually obtained on the reviewed code;
component-view runs for Android are not Android device tests. State unperformed
or non-applicable performance checks explicitly, and provide screenshots for
visible changes from the branch under review, not from the full POC.
