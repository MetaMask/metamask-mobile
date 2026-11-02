# AGENTS.md

MetaMask Mobile: React Native wallet for iOS and Android. TypeScript, Redux (redux-persist, reselect), React Navigation 7, MetaMask controllers.

## Commands

Use yarn only, never npm or npx.

```bash
yarn jest <file> [-t "<pattern>"]   # tests for one file
yarn lint:tsc                        # type check
yarn lint | yarn lint:fix
yarn format | yarn format:check
yarn setup:expo                      # JS-only setup (`yarn setup` for native changes)
yarn watch:clean                     # Metro
```

Builds: `yarn build:{ios|android}:main:{dev|prod|e2e}`. E2E: `yarn appium-smoke:{ios|android}`. Build type: `METAMASK_BUILD_TYPE` = `main` | `flask`.

## Where things live

- `app/core/Engine/`: creates and wires every controller (`controllers/`, `messengers/`). Start here for accounts, networks, transactions, assets.
- `app/core/BackgroundBridge/`: dApp ↔ wallet bridge.
- `app/core/NavigationService/`: navigation from outside React.
- `app/store/`, `app/reducers/`, `app/actions/`, `app/selectors/`: Redux.
- `app/component-library/`: in-repo components; `app/components/`: features.
- `tests/`: E2E framework, fixtures, Appium smoke. Read `tests/AGENTS.md` before touching tests.

## Rules

- New code is TypeScript with no `any`.
- UI: `@metamask/design-system-react-native` first, `app/component-library` second, custom last. Style with `useTailwind()`, `Box`/`Text` and design tokens.
- Every change ships with tests: AAA pattern, external dependencies mocked.
- Version-gated remote flags use `validatedVersionGatedFeatureFlag` in a selector (`docs/readme/version-gated-feature-flags.md`).
- Any screen you touch with animation, lists, polling, prefetch, realtime, heavy images or blur reads `getHardwareTier()` and `useNetworkTier()`, never treats `null` as LOW/offline, never folds the two tiers, and applies the UX matrix in `app/util/deviceCapability/README.md`.
- Rive: Nitro-based `@rive-app/react-native`, see `app/animations/README.md`.
- Never log secrets, keys or account data.

## Guides

- Tests: `docs/testing/{unit-testing,component-view-tests,e2e-testing}.md`, `tests/docs/appium-smoke-testing.md`, `.github/guidelines/E2E_DECISION_TREE.md`
- A/B tests: `docs/ab-testing.md` ("Agent Execution Standard (SSOT)"); check with `bash scripts/check-ab-testing-compliance.sh --staged`
- Everything else: `docs/readme/` (architecture, environment, expo-environment, debugging, troubleshooting, storybook) and `docs/performance/`

Optional `mms-*` agent skills may be installed in this checkout. Use them when they are present, but don't assume any particular one exists.
