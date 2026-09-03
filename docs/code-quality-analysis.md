# MetaMask Mobile — Feature Code-Quality Analysis

**Date:** 2026-09-03 · **Commit analysed:** `e8699135` · **Branch:** `claude/code-quality-analysis-poce6o`

---

## Scope & Method

Thirteen product features were analysed, selected as the self-contained feature domains
with meaningful surface area (>8k source LOC):

| Feature | Root |
| --- | --- |
| Perps | `app/components/UI/Perps/` |
| Predict | `app/components/UI/Predict/` |
| Bridge | `app/components/UI/Bridge/` |
| Ramp | `app/components/UI/Ramp/` |
| Rewards | `app/components/UI/Rewards/` |
| Card | `app/components/UI/Card/` |
| Money | `app/components/UI/Money/` |
| Earn | `app/components/UI/Earn/` |
| Stake | `app/components/UI/Stake/` |
| Confirmations | `app/components/Views/confirmations/` |
| Social Leaderboard | `app/components/Views/SocialLeaderboard/` |
| Homepage | `app/components/Views/Homepage/` |
| Multichain Accounts | `app/components/Views/MultichainAccounts/` |

The **reference standard** used for "standardization" is the project's own declared
architecture, not external opinion:

- `AGENTS.md` — TypeScript-only, no `any`; design-system-first components; `useTailwind()`
  styling; mandatory tests; yarn-only.
- `app/features/SampleFeature/README.md` — the canonical reference implementation. It states
  explicitly: *"Controllers in `/app/core/controllers/`, Redux state in `/app/reducers/`,
  Selectors in `/app/selectors/`"*, and defines the state-management decision tree
  (React state → RTK slice → Controller).
- `docs/perps/perps-review-antipatterns.md` — the Perps team's own review checklist.
- `docs/predict/refactoring-tasks.md` — the Predict team's own 28-task debt register.

### Measured baseline

All figures exclude `*.test.*`, `__mocks__/`, `mocks/`, `testUtils/`.

| Feature | src LOC | src files | avg LOC/file | files >500 LOC | >500/kLOC | test files | test:src | `expect()`/kLOC | `jest.mock`/test file | `useTailwind` : legacy styling | `parseFloat` : `BigNumber` | timers/kLOC | `exhaustive-deps` off/kLOC | `eslint-disable`/kLOC | `ts-ignore` | `any` | TODO/FIXME | `console.*` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Perps | 104,935 | 597 | 176 | **50** | 0.48 | 391 | 0.65 | 160 | 3.6 | 11 : 117 (**9 %**) | **461 : 154** | **0.63** | 0.10 | 0.61 | 2 | 7 | 7 | **43** |
| Predict | 66,220 | 449 | 147 | 24 | 0.36 | 244 | 0.54 | 141 | 3.4 | 72 : 13 (**85 %**) | 61 : 17 | 0.48 | 0.14 | 0.57 | 0 | 4 | 7 | 5 |
| Bridge | 41,130 | 385 | 107 | 12 | 0.29 | 220 | 0.57 | 114 | 2.8 | 21 : 49 (30 %) | 31 : 245 | **0.05** | 0.10 | 0.53 | 2 | 2 | 7 | 18 |
| Ramp | 42,719 | 403 | 106 | 13 | 0.30 | 204 | 0.51 | **97** | 2.9 | 4 : 136 (**3 %**) | 5 : 1 | 0.26 | 0.00 | **0.89** | **15** | **9** | **31** | 5 |
| Rewards | 37,806 | 253 | 149 | 9 | **0.24** | 225 | **0.89** | 151 | **6.4** | 68 : 11 (**86 %**) | 17 : 14 | 0.26 | 0.08 | 1.06 | 2 | 3 | 2 | 10 |
| Card | 34,527 | 250 | 138 | 13 | 0.38 | 174 | 0.70 | **172** | 4.7 | 38 : 10 (79 %) | 30 : 48 | **0.75** | 0.09 | 0.70 | 2 | 3 | 0 | 4 |
| Money | 19,718 | 225 | 88 | **3** | **0.15** | 117 | 0.52 | 168 | 4.0 | 3 : 36 (8 %) | **3 : 134** | 0.30 | 0.05 | **0.36** | 0 | **1** | 2 | 2 |
| Earn | 22,829 | 196 | 116 | 8 | 0.35 | 114 | 0.58 | 124 | 3.4 | 5 : 53 (9 %) | 76 : 139 | 0.26 | **0.26** | 0.48 | 1 | 1 | 21 | 22 |
| Stake | 8,045 | 104 | 77 | **1** | **0.12** | 48 | 0.46 | **81** | 2.4 | 0 : 48 (**0 %**) | 2 : 84 | **0.00** | 0.12 | 0.62 | 0 | 2 | 3 | 3 |
| Confirmations | 50,700 | 778 | **65** | **4** | **0.08** | 443 | 0.57 | 133 | 3.2 | 8 : 197 (4 %) | 23 : 305 | 0.08 | **0.04** | 0.61 | 1 | **13** | 15 | 16 |
| Social Leaderboard | 16,225 | 122 | 133 | 7 | **0.43** | 66 | 0.54 | 101 | 3.0 | 19 : 12 (61 %) | 2 : 0 | 0.55 | 0.12 | **1.79** | 0 | 0 | 16 | 0 |
| Homepage | 13,110 | 164 | 80 | 2 | 0.15 | 72 | **0.44** | 98 | 4.1 | 24 : 5 (83 %) | — | 0.23 | 0.00 | **1.68** | 0 | 1 | 22 | 0 |
| Multichain Accounts | 10,085 | 119 | 85 | 2 | 0.20 | 46 | **0.39** | **78** | 3.4 | 6 : 50 (11 %) | — | 0.30 | 0.00 | **1.98** | 1 | 0 | 19 | 7 |

Bold = best or worst in column. "legacy styling" = `StyleSheet.create` + `useStyles` files.

**Project-level gap affecting every feature:** `jest.config.js` defines
`collectCoverageFrom` and `coverageReporters` but **no `coverageThreshold`** — coverage is
reported, never enforced. Test-quantity differences below are therefore team discipline,
not tooling.

---

# Per-Feature Assessment

## 1. Money — `app/components/UI/Money/` · **8.4 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 9 |
| Architecture & design | 9 |
| Standardization | 8 |
| Maintainability | 9 |
| Code smells | 8 |
| Anti-patterns | 8 |
| Testability & coverage | 8 |
| Bug proneness / reliability | 9 |
| Complexity | 8 |
| Consistency | 8 |
| Extensibility | 8 |
| Overall engineering quality | 9 |

**Why it scores highest.** Money is the only feature that follows the `SampleFeature`
layering contract without deviation. All four of its stateful units live in the core layer —
`app/core/Engine/controllers/money-account-controller-init.ts`,
`money-account-api-data-service-init.ts`, `money-account-balance-service-init.ts`,
`money-account-upgrade-controller-init.ts` — leaving the feature folder as presentation,
selectors and hooks only. Redux state is a canonical RTK slice at
`app/core/redux/slices/moneyBalance/index.ts`.

Decomposition is the tightest of any mid-size feature: 88 LOC/file average, only 3 files
over 500 lines. All 20 hooks in `hooks/` are one-concern and each has a co-located test
(`useMoneyAccountBalance.ts` / `.test.ts`, `useMoneyAccountInterest`, `useMoneyCtaVisibility`,
…). All 5 selector modules in `selectors/` are individually tested. Query keys are
centralised in a single `queryKeys.ts` rather than inlined.

**Reliability is the standout.** 134 `BigNumber` references against 3 `parseFloat` — the
best money-math discipline measured. One `any` in 19,718 LOC, zero `ts-ignore`, zero
snapshot tests, 168 assertions per kLOC (second-highest).

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Large view component | **Medium** | `Views/MoneyHomeView/MoneyHomeView.tsx` (951 LOC, 35 hook calls) | The one file that breaks the feature's own pattern; 35 hook calls in one component make render-cause attribution hard and invite prop-drilling as sections grow. | Extract per-section subcomponents (`MoneyBalanceSection`, `MoneyCtaSection`) mirroring how `Homepage/Sections/` is organised; move orchestration into a `useMoneyHomeView` hook. |
| 2 | Feature-local feature-flag selectors | **Low** | `selectors/featureFlags.ts` (461 LOC) | Flag selectors sit in the feature while the rest of the app resolves flags via `app/util/remoteFeatureFlag`; a 461-line flag module suggests flags accreting without pruning. | Audit for dead flags; align with `validatedVersionGatedFeatureFlag` per `docs/readme/version-gated-feature-flags.md`. |
| 3 | Legacy styling only | **Low** | 24 `StyleSheet.create` + 12 `useStyles`, 3 `useTailwind` | Diverges from the current documented standard (`useTailwind()` + `Box`/`Text`). | Migrate opportunistically; internal consistency is already good, so this is low-risk debt. |
| 4 | Reaches into Confirmations | **Low** | 30 imports of `Views/confirmations/*` | Shared-hub coupling, expected for a deposit flow, but contributes to the repo-wide cycle (see Cross-Feature Patterns). | Consume via a published surface (`confirmations/index.ts`) rather than deep paths. |

---

## 2. Confirmations — `app/components/Views/confirmations/` · **7.9 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 9 |
| Architecture & design | 7 |
| Standardization | 7 |
| Maintainability | 8 |
| Code smells | 8 |
| Anti-patterns | 7 |
| Testability & coverage | 8 |
| Bug proneness / reliability | 8 |
| Complexity | 9 |
| Consistency | 8 |
| Extensibility | 8 |
| Overall engineering quality | 8 |

**Best-decomposed feature in the repository.** 778 source files at a 65 LOC average — the
lowest of any feature — and only **4 files above 500 lines** in 50,700 LOC (0.08/kLOC, six
times better than Perps). The largest file,
`components/activity/transaction-details-hero/transaction-details-hero.tsx`, is 694 lines.

Organisation is disciplined and uniform: kebab-case component folders grouped by domain
(`gas/`, `alerts/`, `rows/`, `send/`, `info/`, `footer/`, `modals/`), hooks grouped into
matching sub-domains (`hooks/gas/`, `hooks/pay/`, `hooks/send/`, `hooks/signatures/`,
`hooks/metrics/`, `hooks/7702/`), and — notably — a **`legacy/` folder that explicitly
quarantines 1,424 LOC across 21 files**. Explicit debt isolation is a maturity signal absent
from every other feature.

Reliability metrics are correspondingly strong: 305 `BigNumber` to 23 `parseFloat`, only 4
timers in 50k LOC (0.08/kLOC), and the **lowest `exhaustive-deps` suppression rate in the
repo** (0.04/kLOC).

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Inverted / circular feature dependency | **High** | 198 imports from `Views/confirmations/**` into `UI/Ramp` (38), `UI/Predict` (38), `UI/Perps` (35), `UI/Earn` (28), `UI/Money` (25), `UI/Bridge` (19), `UI/Stake` (14), `UI/Card` (1) — plus `components/perps-confirmations/`, `components/predict-confirmations/` | Confirmations is the shared hub every feature depends on, yet it depends back on eight of them. Perps↔Confirmations is a true module cycle (57 out, 35 back). Any feature change can break the confirmation path for all others, bundle splitting is impossible, and Jest must load half the app to test one row component. | Invert with registration: features register confirmation renderers into a `ConfirmationTypeRegistry` at startup; Confirmations depends only on the registry interface. Move `perps-confirmations/` and `predict-confirmations/` into their owning features. |
| 2 | Legacy code still on live paths | **Medium** | `legacy/` (21 files, 1,424 LOC) | Well-quarantined, but two confirmation implementations mean two behaviours to keep in sync and double the regression surface. | Attach a removal milestone; block new imports from `legacy/` with an ESLint `no-restricted-imports` rule. |
| 3 | Three concurrent styling systems | **Medium** | 103 `StyleSheet.create` + 94 `useStyles` + 8 `useTailwind` | Lowest adoption (4 %) of the documented `useTailwind()` standard, and three idioms mean a contributor cannot infer the convention from neighbouring files. | Freeze new `StyleSheet.create`; migrate per-folder so each domain folder is internally uniform. |
| 4 | Highest raw `any` count | **Low** | 13 occurrences | `AGENTS.md` mandates no `any`. Concentrated in generic tree/data rendering (`data-tree/`), where generics would work. | Replace with generics or `unknown` + narrowing. |
| 5 | Low-value tests | **Low** | 42 `renders correctly` / `toMatchSnapshot` occurrences | Snapshot tests on presentational rows pass on any change until someone re-records them. | Convert to behavioural assertions on accessibility queries. |

---

## 3. Bridge — `app/components/UI/Bridge/` · **7.7 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 8 |
| Architecture & design | 9 |
| Standardization | 6 |
| Maintainability | 8 |
| Code smells | 7 |
| Anti-patterns | 7 |
| Testability & coverage | 7 |
| Bug proneness / reliability | 9 |
| Complexity | 8 |
| Consistency | 7 |
| Extensibility | 8 |
| Overall engineering quality | 8 |

**Best architecture of the trading features.** Domain logic is externalised to versioned
packages — `@metamask/bridge-controller` and `@metamask/bridge-status-controller`, 185
imports — so the feature folder holds only UI, hooks and view-model glue. Redux lives in the
canonical `app/core/redux/slices/bridge/`.

The hook layer is the best example of single-responsibility decomposition in the codebase:
~100 hooks, each named for exactly one question it answers — `useInsufficientBalance`,
`useHasSufficientGas`, `useIsNetworkGasSponsored`, `useIsNetworkFeeUnavailable`,
`useInsufficientNativeReserveError`, `useIsSendBundleSupported`. `utils/` follows the same
rule: `formatPriceImpact.ts`, `filterOutRwaTokens.ts`, `applyKeyAtCursor.ts`,
`calculateInputFontSize.ts` — pure functions, each with a co-located test. This is what makes
Bridge cheap to test and cheap to change.

**Best reliability profile measured:** 245 `BigNumber` to 31 `parseFloat`, and only **2
timers in 41,130 LOC** (0.05/kLOC) — a near-absent time-based race surface, in contrast to
Perps (66) and Card (26).

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Test code in production module graph | **High** | `hooks/useBridgeQuoteData/runQuoteDataCases.ts` (2,004 LOC, 51 `it()` blocks), `useBatchSellQuoteData/runBatchSellQuoteDataCases.ts` (963), `useBridgeQuoteRequest/runQuoteRequestCases.ts` (765), `useBatchSellQuoteRequest/runBatchSellQuoteRequestCases.ts` (517), `useBridgeQuoteData/runQuoteProviderCases.ts` (119) — **4,368 LOC total** | These files `import { act, waitFor } from '@testing-library/react-native'` and contain the real test bodies, but are named `.ts`, not `.test.ts`. Consequences: (a) `collectCoverageFrom` in `jest.config.js` excludes only `app/**/*.test.*`, so 4,368 lines of test code are counted as **production** code, silently depressing and distorting Bridge's coverage number; (b) any accidental production import pulls `@testing-library/react-native` into the app bundle; (c) test-file ESLint overrides don't apply; (d) `useBridgeQuoteData.test.ts` is a 50-line shell, so the tests are invisible to anyone browsing by filename. | Rename to `*.cases.test.ts`, or move under a `__tests__/` directory and add `!<rootDir>/app/**/run*Cases.ts` to `coveragePathIgnorePatterns`. Cheapest high-value fix in this report. |
| 2 | Oversized Redux slice | **Medium** | `app/core/redux/slices/bridge/index.ts` (1,256 LOC) | Reducers, selectors and derived quote-sorting logic in one module; `selectBridgeQuotes` returns a 9-field composite that many components subscribe to, so unrelated changes re-render broadly. | Split into `slice.ts` / `selectors.ts` / `derived.ts`; narrow the composite selector into focused `reselect` selectors. |
| 3 | Inconsistent hook file layout | **Low** | 76 hook *folders* vs 24 flat hook *files* in `hooks/` | Contributors can't infer the convention; folders vs files also changes import specificity. | Pick folders-with-`index.ts` uniformly (the majority pattern) and convert the 24 stragglers. |
| 4 | Large token-selector component | **Low** | `components/BridgeTokenSelector/BridgeTokenSelector.tsx` (1,049 LOC) | Outlier against the feature's own 107 LOC/file average. | Extract list-row, search and network-filter subcomponents. |
| 5 | Three styling systems | **Low** | 30 `StyleSheet.create` + 19 `useStyles` + 21 `useTailwind` | Mid-migration; the most evenly split of any feature, so no single idiom dominates. | Finish the tailwind migration folder-by-folder. |

---

## 4. Homepage — `app/components/Views/Homepage/` · **7.2 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 8 |
| Architecture & design | 7 |
| Standardization | 7 |
| Maintainability | 8 |
| Code smells | 7 |
| Anti-patterns | 7 |
| Testability & coverage | 6 |
| Bug proneness / reliability | 7 |
| Complexity | 8 |
| Consistency | 7 |
| Extensibility | 7 |
| Overall engineering quality | 7 |

A composition layer that stays a composition layer. `Sections/` holds one folder per surface
(`Perpetuals/`, `Predictions/`, `TopTraders/`, `BalanceBreakdown/`), each with its own local
`hooks/`, keeping the aggregation seam clean. 80 LOC/file average, 2 files over 500. 83 %
`useTailwind` adoption, zero hardcoded `<Text>` literals, zero `console.*`, zero
`exhaustive-deps` suppressions. It is the only feature with a committed performance test
(`Homepage.perf-test.tsx`).

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Reaches into another feature's connection internals | **Medium** | `Homepage.tsx:168` instantiates `<PerpsConnectionProvider isEnabled={isPerpsEnabled} suppressErrorView>` directly | The host screen must know Perps' WebSocket lifecycle primitives to render a card. `Sections/Perpetuals/PerpsSectionWithProvider.tsx:43` already does this correctly behind a wrapper — the top-level duplicate leaks the abstraction back out. | Route everything through `PerpsSectionWithProvider`; Perps should export one self-contained `<PerpsHomeSection />`. |
| 2 | A/B config as code | **Medium** | `abTestConfig.ts` (456 LOC) | Experiment definitions hardcoded in a source file grow monotonically and are never pruned; `docs/ab-testing.md` defines a standard this doesn't clearly follow. | Reconcile against `docs/ab-testing.md` ("Agent Execution Standard"); move variant data to remote config, keep only typed accessors. |
| 3 | Weakest test ratio among the well-built features | **Medium** | 72 test files / 164 source files = **0.44**; 98 `expect()`/kLOC | Homepage is the app's highest-traffic screen and its most feature-coupled composition point, so a regression here is maximally visible. | Add integration tests that assert section visibility against feature-flag and eligibility permutations. |
| 4 | High `eslint-disable` density | **Low** | 22 occurrences = **1.68/kLOC** (third-worst) | Suppressions concentrated in a small codebase indicate friction with lint rules rather than isolated exceptions. | Triage; most are likely resolvable now. |
| 5 | Unresolved TODOs | **Low** | 22 TODO/FIXME markers in 13k LOC | High density for a feature with otherwise low debt. | Convert to tracked tickets or delete. |

---

## 5. Card — `app/components/UI/Card/` · **6.4 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 6 |
| Architecture & design | 6 |
| Standardization | 6 |
| Maintainability | 7 |
| Code smells | 6 |
| Anti-patterns | 6 |
| Testability & coverage | 8 |
| Bug proneness / reliability | 6 |
| Complexity | 7 |
| Consistency | 6 |
| Extensibility | 7 |
| Overall engineering quality | 6 |

Card has the **highest assertion density in the repo** (172 `expect()`/kLOC), a 0.70
test:source ratio, only 3 snapshot tests and **zero TODO/FIXME markers** — the cleanest debt
ledger measured. Its `util/` directory is exemplary: 41 files, one exported function each,
every one with a co-located test (`buildTokenIconUrl`, `extractTokenExpiration`,
`getAssetBalanceKey`, `countryCodeToFlag`, `cardArrival`…). The core layer is right, too:
`app/core/Engine/controllers/card-controller/` contains `CardController`, `CardTokenStore`,
`CardOnboardingStore`, plus a genuine `providers/` + `provider-config.ts` + `provider-types.ts`
abstraction.

What holds it back is that the *UI* layer never settled on one way to reach the backend, and
its directory taxonomy has visible duplicates.

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Four parallel data-access paths | **High** | `CardController` (35 files) · `sdk/CardSDK.ts` 904 LOC (25 files) · `queries/` React Query — `auth.ts`, `cashback.ts`, `credit.ts`, `dashboard.ts`, `pin.ts` (13 files) · `services/DaimoPayService.ts` (3 files) | No single source of truth for Card's backend access. Caching, retry, auth-refresh and error mapping are implemented up to four times with different semantics; a contributor cannot tell which path a new endpoint belongs on, and cache invalidation can't be reasoned about globally. `CardSDK` even reimplements request plumbing (`makeRequest`, `handleApiResponse`, `withErrorHandling`, `parseResponseBody`) that the controller layer already owns. | Make React Query the single read path and `CardController` the single write/state path; reduce `CardSDK` to a typed transport used *by* the controller, and fold `DaimoPayService` into `providers/`. |
| 2 | `util/` **and** `utils/` both exist | **Medium** | `util/` (41 files) and `utils/` (5 files: `cardTransactionAmount`, `cardTransactionDisplayInfo`, `getCardTransactionHeroToken`, `merchantCategoryLabel`, `moneyAccountCardTransaction`) | Two directories one character apart with no rule distinguishing them. Guaranteed misplacement and duplicate helpers over time. | Merge into `utils/` (repo-dominant spelling); add a lint rule banning `util/`. |
| 3 | Three type homes | **Medium** | `Card.types.ts` (11 LOC), `types.ts` (617 LOC), `types/navigation.ts` | Type lookup requires checking three locations; the 11-line `Card.types.ts` is vestigial. | Consolidate into `types/` with `index.ts`, `navigation.ts`, `api.ts`; delete `Card.types.ts`. |
| 4 | Highest timer density | **Medium** | 26 `setTimeout`/`setInterval` in 34,527 LOC = **0.75/kLOC**, the worst measured | Timers in card provisioning/PIN/auth flows are usually standing in for proper state transitions, producing flaky, hard-to-reproduce failures and test flake. | Replace polling/delays with event- or promise-driven state; where polling is unavoidable, centralise it in one hook with explicit backoff. |
| 5 | Mixed money representation | **Low** | 48 `BigNumber` vs 30 `parseFloat` | Card handles fiat balances and cashback; float arithmetic risks cent-level drift. | Standardise on `BigNumber` for all monetary arithmetic; restrict `parseFloat` to display formatting. |

---

## 6. Stake — `app/components/UI/Stake/` · **6.0 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 7 |
| Architecture & design | 5 |
| Standardization | 5 |
| Maintainability | 7 |
| Code smells | 6 |
| Anti-patterns | 5 |
| Testability & coverage | 4 |
| Bug proneness / reliability | 8 |
| Complexity | 8 |
| Consistency | 6 |
| Extensibility | 5 |
| Overall engineering quality | 6 |

Structurally the calmest feature: 77 LOC/file, **one** file over 500 lines, **zero** timers,
84 `BigNumber` against 2 `parseFloat`. Low complexity and low reliability risk.

Its problem is status, not structure. Stake has been superseded by Earn but neither retired
nor promoted to a shared library, so it now lives as a de-facto dependency of its successor.

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Zombie feature acting as a shared library | **High** | Earn imports `Stake/hooks/useStakingEligibility` (3 sites), `Stake/utils/metaMetrics/withMetaMetrics`, `Stake/utils/metaMetrics/tooltipMetaMetricsUtils`, `Stake/components/StakingBalance/StakingBalance`, `Stake/components/LearnMoreModal`, `Stake/constants/events` | Stake is presented as a peer feature but functions as Earn's utility layer. Nobody owns it; deleting it is blocked, evolving it risks Earn, and `Routes.STAKE` / `Routes.STAKE_CONFIRMATION` are still registered so both entry points remain live. | Decide explicitly: either promote the shared parts (`useStakingEligibility`, metrics utils, `StakingBalance`) into `app/components/UI/Earn/` or a neutral `staking-shared/`, then delete the rest — or formally reinstate Stake as an owned feature. |
| 2 | 52 KB of mock data in the production tree | **Medium** | `components/PoolStakingLearnMoreModal/mockVaultRewards.ts` (1,972 LOC) — imported only by `InteractiveTimespanChart.test.tsx`, `PoolStakingLearnMoreModal.test.tsx`, `PoolStakingLearnMoreModal.utils.test.ts` | Test-only fixture in a `.ts` file inside the feature: counted as production code by `collectCoverageFrom` and reachable by the bundler. Same class of defect as Bridge's `run*Cases.ts`. | Move to `__mocks__/` or `.test-fixtures.ts` and add to `coveragePathIgnorePatterns`. |
| 3 | Lowest test coverage of any feature | **High** | 48 test files / 104 source files = **0.46**; **81 `expect()`/kLOC** — the lowest measured | Stake still handles real staking and unstaking funds flows. Lowest verification on a live money path is the wrong trade, and Earn's reuse means Stake bugs surface in Earn. | Prioritise tests on `useStakingEligibility` and the `StakeConfirmationView` / `UnstakeConfirmationView` paths that Earn depends on. |
| 4 | Zero adoption of current styling standard | **Low** | 25 `StyleSheet.create` + 23 `useStyles`, **0** `useTailwind` | Fully legacy — though internally consistent, which is why this scores Low. | Leave alone until the ownership question (#1) is settled; migrating code that may be deleted is waste. |
| 5 | Duplicated components with Earn | **Low** | `UnstakeBanner.tsx` and `ConfirmationFooter.styles.ts` exist in both trees | Divergent copies of the same UI. | Resolve as part of #1. |

---

## 7. Social Leaderboard — `app/components/Views/SocialLeaderboard/` · **5.8 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 6 |
| Architecture & design | 6 |
| Standardization | 5 |
| Maintainability | 5 |
| Code smells | 6 |
| Anti-patterns | 6 |
| Testability & coverage | 6 |
| Bug proneness / reliability | 6 |
| Complexity | 6 |
| Consistency | 6 |
| Extensibility | 6 |
| Overall engineering quality | 6 |

Per-view folders with local `hooks/` and `components/`, a dedicated `analytics/` module and
61 % tailwind adoption are all sound. The problem is density: **7 files over 500 lines in only
16,225 LOC (0.43/kLOC — the second-worst ratio in the repo, behind only Perps)**, so nearly
40 % of the feature sits in a handful of very large components.

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Cluster of oversized components | **High** | `TraderPositionView/components/TraderAdvancedChart.tsx` (1,061), `Onboarding/SocialLeaderboardOnboarding.tsx` (966), `TraderPositionView/TraderPositionView.tsx` (919), `TopTradersView/TopTradersView.tsx` (621), `FeedView/FeedView.tsx` (618), `SocialTradersTabsView/SocialTradersTabsView.tsx` (554), `TraderProfileView/TraderProfileView.tsx` (548) | 5,287 LOC — a third of the feature — in seven files. Each mixes data orchestration, chart/list configuration and layout, so any change requires reading the whole file. A 966-line onboarding flow is almost certainly N screens that should be N components. | Extract per-step components from onboarding; split `TraderAdvancedChart` into chart-config, data-adapter and presentation layers (`useSocialPerpsChartAdapter` already shows the right seam). |
| 2 | Inconsistent hook placement within the same view | **Medium** | `TraderPositionView/useTraderPositionData.ts` and `TraderPositionView/useSpotTraderPositionPrices.ts` and `TraderPositionView/usePerpsTraderPositionPrices.ts` sit at the view root, while `TraderPositionView/hooks/useTraderPosition.ts` and `hooks/useSocialPerpsChartAdapter.ts` sit in a `hooks/` subfolder | Two conventions inside one 4-file view. There is no rule to follow, so the split will keep widening. | Move all five into `TraderPositionView/hooks/`. |
| 3 | Second-worst `eslint-disable` density | **Medium** | 29 occurrences = **1.79/kLOC**; 14 with no `--` justification | The repo elsewhere annotates suppressions with reasons (e.g. Bridge's `-- jest.spyOn must patch the module namespace the hook imports`). Unjustified suppressions can't be safely removed later. | Require justification comments; triage the 14 bare ones. |
| 4 | Near-duplicate price hooks | **Medium** | `useSpotTraderPositionPrices.ts` and `usePerpsTraderPositionPrices.ts` | Two market types handled by two parallel hooks rather than one hook with a market-type parameter — the same per-variant duplication pattern that damages Rewards, caught early. | Unify behind one `useTraderPositionPrices({ marketType })`. |
| 5 | Unresolved TODOs | **Low** | 16 TODO/FIXME in 16k LOC | High for a young feature. | Triage into tickets. |

---

## 8. Earn — `app/components/UI/Earn/` · **5.7 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 6 |
| Architecture & design | 6 |
| Standardization | 5 |
| Maintainability | 5 |
| Code smells | 5 |
| Anti-patterns | 5 |
| Testability & coverage | 6 |
| Bug proneness / reliability | 6 |
| Complexity | 6 |
| Consistency | 6 |
| Extensibility | 6 |
| Overall engineering quality | 6 |

Correct core-layer placement (`app/core/Engine/controllers/earn-controller-init.ts`), a
documented sub-area (`Earn/docs/`) and a reasonable folder taxonomy. Undermined by two
near-duplicate 1k-line input flows, the highest React-dependency-suppression rate in the
repo, and the second-highest debt-marker count.

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Duplicated deposit/withdraw input flows | **High** | `Views/EarnInputView/EarnInputView.tsx` (1,116) and `Views/EarnWithdrawInputView/EarnWithdrawInputView.tsx` (1,022) | Two 1k-line screens implementing the same amount-entry, validation, quote-preview and confirmation pattern in opposite directions. Every keypad, validation or formatting fix must land twice, and drift between them is invisible. | Extract a shared `useEarnAmountInput` hook and `EarnAmountInputScreen` shell; keep only direction-specific validation and copy in the two views. |
| 2 | Highest React dependency-array suppression rate | **High** | 6 `react-hooks/exhaustive-deps` disables = **0.26/kLOC**, 2.6× the Perps rate and 6.5× Confirmations | Each suppression is a deliberately stale closure in a flow that moves user funds — the classic source of "used the previous quote/amount" bugs that are near-impossible to reproduce. | Remove each by restructuring (refs for genuinely-stable callbacks, `useEvent`-style wrappers, or lifting derivation out of the effect). Treat this as a correctness task, not lint hygiene. |
| 3 | Unclear ownership boundary with Stake | **Medium** | 10 imports from `UI/Stake/*` (eligibility hook, metrics utils, `StakingBalance`, `LearnMoreModal`, `constants/events`) | Earn's behaviour is defined partly in a feature it does not own and which has the repo's weakest tests (0.46 ratio, 81 assertions/kLOC). | Resolve jointly with Stake #1: absorb the shared pieces into Earn or a neutral shared module. |
| 4 | Debug logging and unresolved markers | **Medium** | 22 `console.*` and 21 TODO/FIXME in 22,829 LOC | Second-highest for both. `console.*` in a wallet risks leaking values to device logs, against the "never log sensitive information" rule in `AGENTS.md`. | Route through `Logger`; audit each call for sensitive payloads. |
| 5 | Mixed money representation | **Medium** | 76 `parseFloat` vs 139 `BigNumber` | 35 % of numeric handling is float-based in a yield-bearing product where APR/APY compounding amplifies rounding error. | Confine `parseFloat` to display; use `BigNumber` for all APR/amount arithmetic. |
| 6 | Legacy styling only | **Low** | 29 `StyleSheet.create` + 24 `useStyles`, 5 `useTailwind` | 9 % adoption of the documented standard. | Migrate alongside the #1 refactor. |

---

## 9. Multichain Accounts — `app/components/Views/MultichainAccounts/` · **5.6 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 6 |
| Architecture & design | 6 |
| Standardization | 5 |
| Maintainability | 6 |
| Code smells | 6 |
| Anti-patterns | 6 |
| Testability & coverage | 4 |
| Bug proneness / reliability | 5 |
| Complexity | 6 |
| Consistency | 6 |
| Extensibility | 6 |
| Overall engineering quality | 5 |

Sensible folder layout, zero `any`, small average file size. But this feature owns **dApp
permission granting and private-key display**, and it carries the weakest verification and
the highest suppression density in the entire analysis — a combination that matters more here
than anywhere else.

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Weakest test coverage on the most security-sensitive surface | **Critical** | 46 test files / 119 source files = **0.39** (worst) · **78 `expect()`/kLOC** (worst) · **18 of 46 test files are `renders correctly`/snapshot only** (39 %) | The feature contains `MultichainAccountConnect`, `MultichainAccountPermissions`, `MultichainPermissionsSummary` and `PrivateKeyList`. A regression here means granting a dApp scopes the user didn't approve, or exposing key material. Snapshot tests cannot catch either — they assert only that the tree is unchanged. Effective behavioural coverage is roughly half the headline ratio. | Add behavioural tests asserting the *resulting permission set* for each account/scope selection permutation, and that `PrivateKeyList` gates on authentication. Replace the 18 snapshot files. |
| 2 | God component on the permission path | **High** | `MultichainAccountConnect/MultichainAccountConnect.tsx` (1,004 LOC) — 10 % of the feature in one file | Account selection, scope selection, permission diffing and multi-step navigation in one component. Untestable in units, and the file's size is exactly why the tests above are snapshot-only. | Extract `useAccountConnectFlow` for state/step orchestration and split per-step components; the permission-diffing logic should become a pure, exhaustively-tested function. |
| 3 | Worst `eslint-disable` density in the repo | **High** | 20 occurrences = **1.98/kLOC** | On a permissions surface, suppressed lint (especially dependency and exhaustiveness rules) removes exactly the checks that catch missed cases. | Triage every one; on this feature treat suppressions as requiring reviewer sign-off. |
| 4 | Unresolved markers | **Medium** | 19 TODO/FIXME in 10,085 LOC — the highest density measured | Unfinished work in security-relevant code paths. | Audit each for security relevance first, then ticket. |
| 5 | Large permissions-summary component | **Medium** | `MultichainPermissionsSummary/MultichainPermissionsSummary.tsx` (723 LOC) | This component renders what the user is consenting to; complexity here is a consent-accuracy risk. | Decompose into per-permission-type row components with a test each. |
| 6 | Stories without tests | **Low** | `MultichainPermissionsSummary.stories.tsx` (352 LOC) exists while behavioural tests are thin | Effort spent on visual cataloguing rather than correctness. | Keep the story; add the behavioural tests. |

---

## 10. Predict — `app/components/UI/Predict/` · **4.8 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 7 |
| Architecture & design | 4 |
| Standardization | 6 |
| Maintainability | 4 |
| Code smells | 4 |
| Anti-patterns | 4 |
| Testability & coverage | 6 |
| Bug proneness / reliability | 5 |
| Complexity | 3 |
| Consistency | 5 |
| Extensibility | 5 |
| Overall engineering quality | 5 |

Predict has genuinely good *surface* organisation — a clear taxonomy (`queries/`, `schemas/`,
`services/`, `providers/`, `contexts/`, `selectors/`, `routes/`), 85 % tailwind adoption (second
only to Rewards), the broadest React Query adoption of any feature (38 files), a feature
`README.md`, and 5 architecture documents. Zero `ts-ignore`.

Underneath that, four files hold 12,833 LOC — 19 % of the feature — and the layering
contract is inverted. To the team's credit, `docs/predict/refactoring-tasks.md` documents
28 known tasks (7 at P0); the scores below reflect the code as it stands, not the awareness.

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Controller in the view layer | **Critical** | `controllers/PredictController.ts` (**4,724 LOC**), initialised via a 29-line shim at `app/core/Engine/controllers/predict-controller/index.ts` | Predict is the **only** feature that puts a full `BaseController` inside `app/components/UI/`. `SampleFeature/README.md` states controllers belong in the core layer, and every peer complies — Card, Money (×4), Earn, Bridge and Ramp all register in `app/core/Engine/controllers/`; Perps and Bridge go further and externalise to npm packages. The consequence is not cosmetic: a controller under `components/` cannot be consumed or tested without the view layer, cannot be versioned independently, and inverts the dependency direction the Engine assumes. | Move to `app/core/Engine/controllers/predict-controller/`, or externalise as `@metamask/predict-controller` following `@metamask/perps-controller`. |
| 2 | God methods inside the God controller | **Critical** | `PredictController.placeOrder` spans lines **1879–2444 (566 LOC)**; `claimWithConfirmation` 2444–2659 (216); `submitPredictTransactionBatch` 1602–1777 (176) | A 566-line method on the money-moving path cannot be reasoned about or branch-tested. Every order variation adds another branch to the same function, so cyclomatic complexity grows with the product. | Decompose into a pipeline of named, individually-tested steps: `validateOrder` → `resolveDeposit` → `buildTransactionBatch` → `submit` → `reconcile`. |
| 3 | Abstraction defined then bypassed | **High** | `providers/types.ts` declares a full provider interface (~40 methods), but `PredictController.ts:520` declares `private provider: PolymarketProvider` and `:577` does `new PolymarketProvider({...})`; `POLYMARKET_PROVIDER_ID` is hardcoded at **60+ call sites** (lines 602, 729, 734, 901, 905, 939, 943, 973, 977, 1001, 1004, 1035, 1040, 1073, 1078, …) | The interface implies pluggable providers; the implementation is single-provider throughout. This is worse than no abstraction: it costs maintenance (two things to keep in sync), misleads readers about extensibility, and the hardcoded IDs mean adding a second venue is a 60-site edit, not an injection. Contrast Perps, whose `AggregatedPerpsProvider`/`ProviderRouter` genuinely routes between HyperLiquid and MYX. | Either type the field as the interface and inject the concrete provider (deriving `providerId` from it), or delete `providers/types.ts` and be honestly Polymarket-specific until a second venue is real. |
| 4 | Analytics bookkeeping fused into business logic | **High** | Controller instance fields: `pendingOrderPreviews`, `pendingClaimAnalytics`, `claimTerminalEmitted: Set`, `flowTerminalMetricEmitted: Set`, `predictBuyTerminalEmitted: Set`, `predictBuyTerminalEmissionOrder: string[]`, `predictBuyAttempts: Map`, `retryablePredictBuyAttemptIdsByAddress: Map` — plus `trackPredictFlowMetric`, `trackTransactionSubmissionMetric`, `trackFlowSubmissionFailureMetric`, `trackClaimTransactionOutcome`, `trackTerminalFlowOutcomeMetric`, `buildClaimAnalyticsProperties`, `getTerminalFlowStatus`, `getTerminalFlowFailureReason`, `getTerminalFlowTransactionType` | Eight mutable de-duplication collections and nine tracking methods make telemetry a stateful concern of the trading controller. These `Set`s grow unbounded within a session (a memory-growth path), and analytics changes now carry order-execution regression risk. | Extract a `PredictAnalyticsReporter` that subscribes to controller events; keep dedup state and emission ordering entirely inside it. |
| 5 | God provider and God utils | **High** | `providers/polymarket/PolymarketProvider.ts` (**3,402 LOC**), `providers/polymarket/utils.ts` (**2,807 LOC**), `providers/polymarket/WebSocketManager.ts` (1,729 LOC) | 7,938 LOC in three files. A 2,807-line `utils.ts` is a name that means "no home was found", so it becomes the default dumping ground. | Split by concern: `polymarket/orders/`, `polymarket/markets/`, `polymarket/pricing/`, `polymarket/ws/`; break `utils.ts` into named modules with co-located tests, as Bridge's `utils/` does. |
| 6 | Monolithic type barrel | **Medium** | `types/index.ts` (900 LOC) | Every consumer imports the whole barrel, so any type change invalidates broad swathes of the build and makes circular-import risk hard to see. | Split by domain (`types/market.ts`, `types/order.ts`, `types/position.ts`) and re-export selectively. |
| 7 | Oversized card component | **Medium** | `components/PredictCryptoUpDownMarketCard/PredictCryptoUpDownMarketCard.tsx` (1,502 LOC) | A single card component larger than most whole features' biggest file. | Decompose into chart, price-header, action-row and outcome subcomponents. |
| 8 | Float arithmetic on money paths | **Medium** | 61 `parseFloat` vs 17 `BigNumber` — the second-most float-dominant profile after Perps | Prediction-market share prices and payouts are exact-precision values; floats introduce drift in position sizing and PnL. Compare Money (3:134) and Bridge (31:245). | Move share/collateral/payout arithmetic to `BigNumber`. |
| 9 | Acknowledged stale workaround | **Low** | `providers/polymarket/utils.ts:662` — Super Bowl LX temporary fix, listed as P0 Task 6 in `docs/predict/refactoring-tasks.md` | Event-specific dead code in a shared utility. | Delete. |
| 10 | Hardcoded UI strings | **Low** | `"Current price"`, `"Price to beat"`, `"No price history available"`, `"Unable to load price history"` in `<Text>` children | Unlocalisable. Predict has the lowest `strings()` density of the trading features (3.9/kLOC vs Ramp 12.3, Card 12.3). | Move to `locales/languages/en.json`. |

---

## 11. Rewards — `app/components/UI/Rewards/` · **4.7 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 5 |
| Architecture & design | 4 |
| Standardization | 5 |
| Maintainability | 4 |
| Code smells | 3 |
| Anti-patterns | 3 |
| Testability & coverage | 7 |
| Bug proneness / reliability | 7 |
| Complexity | 6 |
| Consistency | 5 |
| Extensibility | 3 |
| Overall engineering quality | 4 |

Rewards has the **best test:source ratio in the repo (0.89)**, the **highest tailwind adoption
(86 %)**, the fewest TODO markers (2) and the smallest max-file size of the large features
(610 LOC). Judged file-by-file it looks healthy.

Judged as a system it is the clearest case of **duplication-driven design** in the codebase.
Each campaign is a hand-copied vertical slice, and the cost is paid on every new campaign.

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Copy-paste-per-campaign views | **Critical** | Four parallel view families in the flat `Views/` directory: `OndoCampaignDetailsView` (595) · `PredictThePitchCampaignDetailsView` (593) · `PerpsTradingCampaignDetailsView` · `MoneyAccountSweepstakesCampaignDetailsView`; plus `*CampaignWinningView` ×4 (73/79/80/70 LOC), `*CampaignStatsView` ×3, `*CampaignLeaderboardView` ×3, `*CampaignPortfolioView` ×2 | Verified by normalised diff: `OndoCampaignWinningView` vs `PredictThePitchCampaignWinningView` differ by **40 diff lines out of ~75** after stripping campaign names — same structure, same hooks, different constants (`PRIZE_EMAIL = 'ondocampaign@consensys.net'` vs `'predictcampaign@consensys.net'`) and different testIDs. The Details views are worse: 595 vs 593 LOC producing **658 diff lines** — copied, then diverged, so the four have silently drifted apart. Every cross-campaign fix is four edits, and a fix applied to three of four is undetectable. | Introduce a campaign **strategy/registry**: one `CampaignDetailsView`, `CampaignWinningView`, `CampaignStatsView` and `CampaignLeaderboardView` driven by a `CampaignConfig` record (`{ id, prizeEmail, testIdPrefix, dataHooks, copyKeys, components }`). Register campaigns as data. |
| 2 | Parallel hook families for one concept | **Critical** | Outcome: `useCampaignParticipantOutcome`, `useOndoCampaignParticipantOutcome`, `usePerpsTradingCampaignParticipantOutcome`, `useGetPredictThePitchOutcome`, `useMoneyAccountSweepstakesOutcome`, plus `useGetOutcome` · Outcome toasts: `useCampaignOutcomeToast`, `useOndoOutcomeToast`, `usePerpsTradingCampaignEndedOutcomeToast`, `useGetPredictThePitchOutcomeToast`, `useMoneyAccountSweepstakesOutcomeToast` · Leaderboards: `useGetOndoLeaderboard(+Position)`, `useGetPerpsTradingCampaignLeaderboard(+Position)`, `useGetPredictThePitchLeaderboard(+Position)`, plus generic `useCampaignLeaderboardEntries` · Prize pool: `useGetMoneyAccountSweepstakesPrizePool`, `useGetPredictThePitchPrizePool` · Opt-in: `useOptIn`, `useOptInToCampaign`, `useMoneyAccountSweepstakesOptIn` | ~20 hooks implementing five concepts. Note that generic versions **already exist** (`useCampaignParticipantOutcome`, `useCampaignOutcomeToast`, `useCampaignLeaderboardEntries`) yet the per-campaign copies were added anyway — so the abstraction is present and ignored, and the two coexisting `OndoCampaignWinningView`/`PredictThePitchCampaignWinningView` files call *differently-named hooks for identical work*. Behaviour now depends on which copy a screen happens to import. | Collapse to one hook per concept, parameterised by `campaignId`, resolving campaign-specific endpoints through the registry from #1. Delete the per-campaign copies. |
| 3 | No polymorphic dispatch anywhere | **High** | Zero `campaignId ===` / `CampaignId.` switches found across the feature; `RewardsNavigator.tsx` registers **29 hardcoded `Stack.Screen`s** in 315 LOC | There is no seam where campaign variation is expressed as data. Adding a campaign means ~5 new views, ~6 new hooks and ~5 new routes — a fixed, large, entirely mechanical cost, repeated per campaign. This is the direct cause of the 3/10 extensibility score. | Generate routes from the campaign registry; a new campaign should be one config object plus its genuinely-unique component. |
| 4 | Flat `Views/` directory | **Medium** | ~30 view files directly in `Views/` (`*.tsx` + `*.test.tsx` + occasional `*.types.ts` side by side) | Every peer feature uses per-view folders (`Money/Views/MoneyHomeView/`, `Earn/Views/EarnInputView/`). The flat layout is why styles, testIDs and types have nowhere consistent to live, and it makes the duplication in #1 visually invisible. | Convert to per-view folders with `index.ts`, `*.styles.ts`, `*.testIds.ts`. |
| 5 | Naming inconsistency | **Medium** | `useOptIn` vs `useOptInToCampaign` vs `useMoneyAccountSweepstakesOptIn`; `useOptout` (lowercase *o*) vs `useOptIn`; `useGetOutcome` vs `useCampaignParticipantOutcome`; `useGetOndoLeaderboard` vs `useCampaignLeaderboardEntries` | `useGet*` and bare-verb prefixes are used interchangeably with no rule; `useOptout`/`useOptIn` casing disagrees within one pair. Contributors cannot guess a hook's name, which is itself a driver of duplicate creation. | Adopt one convention (`use<Domain><Thing>`), rename, and enforce in review. |
| 6 | Heaviest test mocking | **Medium** | **6.4 `jest.mock()` per test file** — 1,433 mocks across 225 files, nearly double the repo median | The excellent 0.89 ratio is achieved by mocking almost everything, so tests largely assert that a component calls mocks that were configured to be called. They will not catch the cross-campaign drift in #1 — which is precisely the defect the feature is most exposed to. | As the registry lands, replace per-campaign component mocks with table-driven tests over the campaign config, exercising real hooks against a fake transport. |

---

## 12. Perps — `app/components/UI/Perps/` · **4.6 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 6 |
| Architecture & design | 6 |
| Standardization | 5 |
| Maintainability | 4 |
| Code smells | 4 |
| Anti-patterns | 4 |
| Testability & coverage | 6 |
| Bug proneness / reliability | 4 |
| Complexity | 3 |
| Consistency | 4 |
| Extensibility | 5 |
| Overall engineering quality | 4 |

**What Perps does better than anyone.** Domain logic is externalised to
`@metamask/perps-controller@^15.1.0` (494 imports) — the cleanest domain/UI split in the
repository, and the model Predict should copy. Its provider abstraction is real
(`AggregatedPerpsProvider` → `ProviderRouter`, routing HyperLiquid and MYX). Documentation is
by far the best: 16 documents in `docs/perps/` including an architecture guide, a caching
architecture, a connection architecture, a MetaMetrics reference, a Sentry reference, a
decimals spec and a **self-authored review anti-pattern checklist**. Test volume is serious —
391 test files, 160 assertions/kLOC, and `CandleStreamChannel.ts` (950 LOC) carries 2,384 LOC
of tests.

**Why it still scores 4.6.** At 104,935 LOC it is 2.1× the next-largest feature, and the
scale has not been matched by decomposition: **50 files over 500 lines** (0.48/kLOC, six times
the Confirmations rate). Three of the four largest files in the entire repository are Perps'.
The measured code also contradicts the feature's own documented rules in several places.

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | God hook | **Critical** | `Views/PerpsProMarketView/components/PerpsProOrderForm/usePerpsProOrderForm.ts` — **3,786 LOC**, **123** `useState`/`useEffect`/`useCallback`/`useMemo`/`useRef` calls, returning **60+ keys** | The single most complex unit in the codebase, and it owns order entry — direction, leverage, order type, chase orders, limit price, trigger price, scale orders, TWAP, TP/SL, slippage, fees, eligibility and five modal visibility flags. A 60-key return object means any consumer re-renders on any change. 123 hook calls make the dependency graph unauditable, so correctness cannot be established by reading it, and no unit test can isolate one behaviour. | Split by concern into composable hooks (`useOrderDirection`, `useLeverage`, `useOrderPricing`, `useScaleOrder`, `useChaseOrder`, `useOrderFees`, `useOrderSubmission`) composed by a thin `usePerpsProOrderForm`; return grouped sub-objects instead of a flat 60-key bag. |
| 2 | God singleton implementing an ad-hoc state machine | **Critical** | `services/PerpsConnectionManager.ts` — 2,145 LOC, `private static instance`, **~45 mutable private fields** including `isConnected`, `isConnecting`, `isInitialized`, `isDisconnecting`, `isPreloading`, `isInGracePeriod`, `isContextChangePrepared`, `wasOffline`, `pendingSkipMarketNotify`, `pendingConnectionGenerationAdvanced`; six in-flight promise guards (`initPromise`, `disconnectPromise`, `ensureConnectedPromise`, `pendingReconnectPromise`, `contextChangePreparationPromise`); three hand-rolled generation counters (`connectionGeneration`, `initializationGeneration`, `subscriptionGeneration`); five timers; three listener `Set`s; and a `connectionRefCount` | Connection lifecycle is encoded as ~45 interacting booleans, counters and promise latches rather than as explicit states and transitions. The number of reachable combinations is astronomically larger than the number of legal ones, so bugs manifest as unreproducible stuck/duplicate-connection states. Being a module-level singleton with `Engine` and `store` imported directly, it also cannot be instantiated per test — every test shares one mutable global. | Model explicitly as a finite state machine (states: `disconnected`/`connecting`/`connected`/`grace`/`reconnecting`/`disconnecting`; events: `connect`/`disconnect`/`netLost`/`netRestored`/`contextChange`/`timeout`) with one `state` field and one transition function. Inject `Engine`/`store` so instances are testable. |
| 3 | Multi-class monolith and half-finished extraction | **High** | `providers/PerpsStreamManager.tsx` — 3,075 LOC containing the abstract `StreamChannel<T>` base plus `PriceStreamChannel`, `OrderStreamChannel`, `PositionStreamChannel` and the React provider — while `CandleStreamChannel` (950 LOC) was already extracted to `providers/channels/` | The extraction to `channels/` establishes the right pattern and then stops, leaving two conventions for the same concept. A `.tsx` file holding four classes plus a provider is unnavigable and forces unrelated stream changes into the same merge surface. | Finish the extraction: one channel per file under `providers/channels/`, base class in `providers/StreamChannel.ts`, leaving `PerpsStreamManager.tsx` as provider + registry only. |
| 4 | Violates the feature's own documented anti-pattern rules | **High** | `docs/perps/perps-review-antipatterns.md` opens with *"Defaulting to `0` when data is unavailable — the most common mistake… Defaulting to `0` hides loading states, makes bugs invisible, and can mislead users into thinking their balance/PnL is actually zero."* Yet `usePerpsProOrderForm.ts:852–860` does exactly that: `if (!currentPrice) return { price: 0, change: 0, markPrice: 0 }` and `Number.parseFloat(currentPrice.price \|\| '0')`, `markPrice \|\| '0'`, `percentChange24h \|\| '0'` — in the order form | A documented rule that the largest file in the feature breaks is not an active control. Worse, the specific harm the doc predicts applies here: a not-yet-loaded mark price silently becomes `0` inside order-entry maths, which feeds validation and sizing. | Return the documented sentinels (`PERPS_CONSTANTS.FallbackPriceDisplay` for display; `null`/`undefined` for maths) and make the order form handle "not loaded" as a distinct state. Then enforce the rule in CI with a lint rule or a review checklist gate. |
| 5 | Float arithmetic on a leveraged-trading path | **High** | **461 `parseFloat` vs 154 `BigNumber`** — the most float-dominant profile measured. In `usePerpsProOrderForm.ts` alone: `:654` chase max distance, `:855–857` price/markPrice/percentChange, `:1282–1283` scale-order start/end price, `:1307–1310` best ask/bid, `:1322` top-of-book price, `:1340–1343` USD amount | Leverage multiplies rounding error, and these are order-sizing and liquidation-relevant inputs, not display values. Peer features that handle money show the opposite ratio (Money 3:134, Bridge 31:245, Confirmations 23:305), so this is a Perps-specific choice, not a platform constraint. `docs/perps/perps-rules-decimals.md` specifies display precision but does not address arithmetic precision. | Use `BigNumber` for all price/size/margin/PnL arithmetic; restrict `parseFloat` to formatting at the render boundary. |
| 6 | Provider sprawl with a compensating mechanism | **High** | `PerpsConnectionProvider` is instantiated at **9+ sites across 6 features**: `Views/Homepage/Homepage.tsx:168`, `Homepage/Sections/Perpetuals/PerpsSectionWithProvider.tsx:43`, `Views/ActivityDetails/templates/PerpsDetails.tsx:521`, `Views/ActivityList/hooks/PerpsActivitySource.tsx:77`, `Views/TrendingView/feeds/perps/PerpsSectionProvider.tsx:10`, `Perps/Views/PerpsTransactionsView/PerpsOrderTransactionView.tsx:271`, and `Perps/routes/index.tsx:147, 234, 276`. `PerpsGlobalErrorGate.tsx:19` documents its own purpose as working *"regardless of how many PerpsConnectionProvider instances exist"* | The design intends one owner (`PerpsAlwaysOnProvider` at wallet root); reality is nine instances plus a global error gate built to paper over the multiplicity. Refcount and generation bugs are inherent to this shape, and the same provider pair is duplicated three times inside `routes/index.tsx` alone. | Expose one self-contained `<PerpsSurface />` per embedding point and forbid direct `PerpsConnectionProvider` use outside the feature via `no-restricted-imports`. Extract the repeated provider pair in `routes/index.tsx` into one wrapper. |
| 7 | Documentation drift | **Medium** | `docs/perps/perps-review-antipatterns.md` mandates *"All `PerpsConnectionProvider` instances use `manageLifecycle={false}`"*, but `manageLifecycle` **does not exist anywhere in the codebase** (0 occurrences) | A review checklist citing a removed API trains reviewers to check nothing, and undermines confidence in the other 15 documents — Perps' strongest asset. | Re-derive the doc from current code and add a doc-review step whenever the connection API changes. |
| 8 | God views | **Medium** | `Views/PerpsOrderView/PerpsOrderView.tsx` (2,464), `Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx` (2,272), `components/TradingViewChart/TradingViewChartTemplate.tsx` (1,762), `Views/PerpsProMarketView/components/PerpsProPositionsPanel.tsx` (1,381), `Views/PerpsHomeView/PerpsHomeView.tsx` (1,298), `Views/PerpsClosePositionView/PerpsClosePositionView.tsx` (1,117), `Views/PerpsTPSLView/PerpsTPSLView.tsx` (1,091) | Seven views over 1,000 LOC. Note `PerpsOrderView` (2,464) and `PerpsProOrderForm` (1,038 + a 3,786-line hook) are two separate order-entry implementations — the same duplication risk Rewards realised. | Decompose into section components; identify and share the common order-entry core between the standard and Pro forms. |
| 9 | Configuration monoliths | **Medium** | `hooks/usePerpsToasts.tsx` (1,304 LOC, 14 top-level config groups), `Perps.testIds.ts` (1,283 LOC) | Toast copy/config as executable code in a hook rather than data; a 1,283-line testID file is a permanent merge-conflict hotspot. | Move toast definitions to a typed data module consumed by a thin hook; split testIDs per view alongside their components. |
| 10 | Three styling systems, lowest-but-one adoption | **Medium** | 67 `StyleSheet.create` + 50 `useStyles` + 11 `useTailwind` = **9 %** adoption | With 117 legacy files against 11 modern, a contributor copying a neighbouring file will almost always pick the deprecated idiom, so the gap self-perpetuates. | Freeze new `StyleSheet.create` in Perps; migrate per-view during the decomposition work above. |
| 11 | Highest timer density and debug logging | **Medium** | 66 `setTimeout`/`setInterval` (0.63/kLOC) and **43 `console.*`** — the most of any feature | Timers on a WebSocket-driven surface are the main source of flaky ordering bugs and test flake; `console.*` in a trading feature risks writing balance/position values to device logs, against `AGENTS.md`'s "never log sensitive information". | Replace timers with event-driven transitions where possible; route all logging through `Logger` with the `{ feature: 'perps', context }` shape the feature's own Sentry doc requires. |

---

## 13. Ramp — `app/components/UI/Ramp/` · **3.6 / 10**

| Criterion | Score |
| --- | --- |
| Code organization | 3 |
| Architecture & design | 3 |
| Standardization | 3 |
| Maintainability | 3 |
| Code smells | 3 |
| Anti-patterns | 2 |
| Testability & coverage | 5 |
| Bug proneness / reliability | 5 |
| Complexity | 6 |
| Consistency | 3 |
| Extensibility | 4 |
| Overall engineering quality | 3 |

Individual files are not the problem — Ramp's 106 LOC/file average is second-best among the
large features. The problem is that there are **two of everything**, and the migration that
was supposed to resolve that has stalled with the two halves importing each other.

Ramp also carries the worst type-safety and debt-marker profile in the analysis: **15
`ts-ignore`/`ts-expect-error`** (next worst: 2), **9 `any`**, **31 TODO/FIXME**, and 0.89
`eslint-disable`/kLOC.

### Code smells & anti-patterns

| # | Issue | Severity | Where | Why it's a problem | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Two parallel implementations of the same feature | **Critical** | Legacy `Aggregator/` = 128 files / **14,134 LOC**; new tree = 278 files / **28,789 LOC**. **Seven directory names collide** (`Views`, `components`, `constants`, `hooks`, `orderProcessor`, `types`, `utils`) and **14 filenames are duplicated across both trees**, including the primary screens: `BuildQuote.tsx` (900 vs **1,227** LOC), `Checkout.tsx`, `OrderDetails.tsx`, `ErrorView.tsx`, `QuickAmounts.tsx`, `SettingsModal.tsx`, plus `BuildQuote.styles.ts`, `BuildQuote.testIds.ts`, `Checkout.styles.ts`, `Checkout.testIds.ts`, `getSdkEnvironment.ts`, `navigation.ts` | Two live implementations of the buy/sell funnel. Every fix must be assessed against both, and a fix applied to one is invisible in the other — the highest-probability regression shape in this report, on a flow that moves real fiat. Bug reports cannot be triaged without first determining which implementation the user hit. | Pick the target tree, then run a true strangler migration: route 100 % of traffic to it behind a flag, verify, and **delete `Aggregator/`**. Do not maintain both. |
| 2 | Migration coupled in both directions | **Critical** | **31 files in the new tree import from `Aggregator/`** | This is worse than an unmigrated legacy tree: the new implementation depends on the code it is meant to replace, so `Aggregator/` cannot be deleted and the migration cannot finish incrementally. The "replacement" is now a dependent. | Enumerate the 31 edges; for each, either copy the dependency into the new tree or extract it to a neutral `ramp-shared/`. Add `no-restricted-imports` banning `Aggregator/` from the new tree so the count can only fall. |
| 3 | Worst type-safety profile in the analysis | **High** | 15 `ts-ignore`/`ts-expect-error`, 9 `any`, in 42,719 LOC | `AGENTS.md`: *"All new code MUST be TypeScript, NO `any` type."* Ramp accounts for more type-checker suppressions than the other twelve features combined (13). Payment, KYC and quote payloads are exactly where a wrong shape becomes a failed or mis-priced transaction. | Replace each with runtime validation at the API boundary (Predict's `schemas/` is the in-repo precedent) and generated provider types. |
| 4 | Dev playground and planning docs shipped in the feature tree | **High** | `Views/HeadlessPlayground/HeadlessPlayground.tsx` (**1,628 LOC**), `debug/RampsDebugBridge.ts`, `headless/PLAN.md`, `headless/PLAN_-_ALL_PROVIDERS_SUPPORT.md` | A 1,628-line playground registered in the feature's routes is the fourth-largest file in Ramp, must compile and be maintained, and risks reachability in production builds. In-progress design documents inside source directories go stale immediately and belong in `docs/`. The repo has a proper mechanism for dev-only surfaces — code fencing (`///: BEGIN:ONLY_INCLUDE_IF(...)`) as used by `SampleFeature` — and it is not used here. | Code-fence or move the playground behind a dev-only entry point; relocate `PLAN*.md` to `docs/`; confirm `RampsDebugBridge` is stripped from release builds. |
| 5 | Weakest effective test signal | **High** | 204 test files but **97 `expect()`/kLOC** (second-lowest) and **43 `renders correctly`/`toMatchSnapshot`** occurrences — the most in the repo | Coverage is broad and shallow, dominated by snapshots that cannot detect behavioural divergence between the duplicated screens in #1 — the one failure mode Ramp most needs to detect. | Replace snapshots with behavioural tests over the quote → checkout → order funnel; add contract tests per provider. |
| 6 | Highest debt-marker count | **Medium** | **31 TODO/FIXME/HACK** in 42,719 LOC | Highest absolute count measured, consistent with the stalled migration. | Triage into tickets attached to the #1 consolidation. |
| 7 | Lowest adoption of the styling standard | **Medium** | 84 `StyleSheet.create` + 52 `useStyles` + 4 `useTailwind` = **3 %** | The lowest in the repo; the legacy tree makes the modern idiom effectively unreachable by copy-paste. | Deprioritise until #1/#2 land — restyling code slated for deletion is waste. |
| 8 | Hardcoded endpoints | **Low** | 43 hardcoded `http(s)://` literals in non-test sources — the most measured | Provider/environment URLs inline rather than in `constants/`, so environment promotion requires code edits. | Centralise per-environment configuration; `getSdkEnvironment.ts` (which itself exists in both trees) is the natural home. |

---

# Final Comparison

Overall score = unweighted mean of all twelve criteria.

| Rank | Feature | Overall | Organization | Architecture | Standardization | Maintainability | Testability | Reliability | Complexity | Code Smells | Anti-Patterns |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Money** | **8.4** | 9 | 9 | 8 | 9 | 8 | 9 | 8 | 8 | 8 |
| 2 | **Confirmations** | **7.9** | 9 | 7 | 7 | 8 | 8 | 8 | 9 | 8 | 7 |
| 3 | **Bridge** | **7.7** | 8 | 9 | 6 | 8 | 7 | 9 | 8 | 7 | 7 |
| 4 | **Homepage** | **7.2** | 8 | 7 | 7 | 8 | 6 | 7 | 8 | 7 | 7 |
| 5 | **Card** | **6.4** | 6 | 6 | 6 | 7 | 8 | 6 | 7 | 6 | 6 |
| 6 | **Stake** | **6.0** | 7 | 5 | 5 | 7 | 4 | 8 | 8 | 6 | 5 |
| 7 | **Social Leaderboard** | **5.8** | 6 | 6 | 5 | 5 | 6 | 6 | 6 | 6 | 6 |
| 8 | **Earn** | **5.7** | 6 | 6 | 5 | 5 | 6 | 6 | 6 | 5 | 5 |
| 9 | **Multichain Accounts** | **5.6** | 6 | 6 | 5 | 6 | 4 | 5 | 6 | 6 | 6 |
| 10 | **Predict** | **4.8** | 7 | 4 | 6 | 4 | 6 | 5 | 3 | 4 | 4 |
| 11 | **Rewards** | **4.7** | 5 | 4 | 5 | 4 | 7 | 7 | 6 | 3 | 3 |
| 12 | **Perps** | **4.6** | 6 | 6 | 5 | 4 | 6 | 4 | 3 | 4 | 4 |
| 13 | **Ramp** | **3.6** | 3 | 3 | 3 | 3 | 5 | 5 | 6 | 3 | 2 |

Remaining criteria (not shown above, included in the mean):

| Feature | Consistency | Extensibility | Overall eng. quality |
| --- | --- | --- | --- |
| Money | 8 | 8 | 9 |
| Confirmations | 8 | 8 | 8 |
| Bridge | 7 | 8 | 8 |
| Homepage | 7 | 7 | 7 |
| Card | 6 | 7 | 6 |
| Stake | 6 | 5 | 6 |
| Social Leaderboard | 6 | 6 | 6 |
| Earn | 6 | 6 | 6 |
| Multichain Accounts | 6 | 6 | 5 |
| Predict | 5 | 5 | 5 |
| Rewards | 5 | 3 | 4 |
| Perps | 4 | 5 | 4 |
| Ramp | 3 | 4 | 3 |

---

## Best-engineered feature — **Money (8.4)**

Money wins on the criteria the brief prioritises: simplicity, layering, project-convention
adherence and low regression risk.

It is the only feature whose layering matches the project's own reference architecture
exactly. All four stateful units sit in the core layer (`money-account-controller-init`,
`money-account-api-data-service-init`, `money-account-balance-service-init`,
`money-account-upgrade-controller-init`), Redux is a canonical RTK slice
(`app/core/redux/slices/moneyBalance/`), and the feature folder is presentation, hooks and
selectors only. No competing data-access path exists (contrast Card's four), no controller
leaks into the view layer (contrast Predict), and no parallel implementation exists (contrast
Ramp).

Decomposition follows through: 88 LOC/file, 3 files over 500, every one of ~20 hooks
single-concern with a co-located test, all 5 selector modules individually tested, query keys
centralised in `queryKeys.ts`. Reliability is the best measured — 134 `BigNumber` to 3
`parseFloat`, one `any` in 19,718 LOC, zero `ts-ignore`, zero snapshot tests, 168
assertions/kLOC. Its only real defect is `MoneyHomeView.tsx` at 951 LOC.

Notably, Money achieves this at 19,718 LOC while handling deposits, balances, interest and
activity — evidence that the low scores below are not a size penalty but a consequence of
decisions that Money did not make.

## Most problematic feature — **Ramp (3.6)**

Two live implementations of the same fiat on/off-ramp funnel: legacy `Aggregator/` (14,134
LOC) and the new tree (28,789 LOC), with seven colliding directory names and 14 duplicated
filenames including `BuildQuote.tsx`, `Checkout.tsx` and `OrderDetails.tsx`. Any fix to the
buy flow must be assessed twice, and a fix applied once is undetectable.

The migration meant to resolve this has inverted: **31 files in the new tree import from
`Aggregator/`**, so the replacement now depends on the code it replaces and the legacy tree
cannot be deleted. A stalled strangler migration is worse than either endpoint, and there is
no ratchet preventing new coupling.

Compounding it: the worst type-safety profile in the analysis (15 `ts-ignore` — more than the
other twelve features combined at 13 — plus 9 `any`) on payment and KYC payloads; 31
TODO/FIXME; a 1,628-line `HeadlessPlayground` dev screen plus `PLAN*.md` design documents
committed inside source directories, when the repo already has code fencing for dev-only
surfaces; and 43 snapshot tests carrying much of the nominal coverage, which cannot detect
divergence between the duplicated screens.

## Most standardized implementation — **Money**, with **Confirmations** for internal consistency

Judged against the project's declared architecture (`SampleFeature/README.md` + `AGENTS.md`),
**Money** is the closest match: controllers in the core layer, RTK slice in
`app/core/redux/slices/`, selectors tested in `selectors/`, hooks one-concern with co-located
tests, per-view folders with `.styles.ts`/`.testIds.ts`/`index.ts`. Its one deviation is low
`useTailwind()` adoption (8 %) — but its legacy styling is *uniform*, so a contributor can
still infer the local convention.

**Confirmations** is the most internally consistent at scale: 778 files under one naming
scheme (kebab-case domain folders, hooks grouped into matching sub-domains, co-located tests,
`legacy/` quarantined) with the lowest `any`-per-file and dependency-suppression rates. Its
weakness is the same styling split, more acutely (103 `StyleSheet.create` + 94 `useStyles` +
8 `useTailwind`).

Worth separating two different things the raw tailwind numbers conflate: **Rewards (86 %)**
and **Predict (85 %)** lead on the *newest* styling standard while scoring 4.7 and 4.8
overall. Adopting the current idiom is not the same as being standardized — Rewards has 20
hooks implementing five concepts and Predict puts a 4,724-line controller in the view layer.
Where features are genuinely uniform is what matters.

## Most maintainable implementation — **Confirmations**, closely followed by **Money** and **Bridge**

**Confirmations** is easiest to evolve *at scale*: 65 LOC/file across 778 files, only 4 files
over 500 in 50,700 LOC, a predictable path for any concern (a gas change lives in
`components/gas/` and `hooks/gas/`), and `legacy/` explicitly fenced so contributors know what
not to extend. A newcomer can locate and safely change one behaviour without reading
neighbouring code — the practical test of maintainability.

**Bridge** is the best model at the unit level. Its ~100 hooks are each named for one question
(`useInsufficientBalance`, `useIsNetworkGasSponsored`, `useIsNetworkFeeUnavailable`) and its
`utils/` are pure functions with co-located tests (`formatPriceImpact`, `filterOutRwaTokens`,
`applyKeyAtCursor`). Changes are local and provable by construction.

**Money** matches both but over a smaller surface, so it demonstrates less.

## Most bug-prone implementation — **Perps**, with **Multichain Accounts** the most consequential per-defect

**Perps** carries the highest measured regression risk on every axis:

- **461 `parseFloat` vs 154 `BigNumber`** — the most float-dominant profile measured, on a
  *leveraged* trading path where rounding error is multiplied, at
  `usePerpsProOrderForm.ts:1282–1283` (scale-order bounds), `:1307–1310` (best bid/ask),
  `:1340–1343` (USD amount). Peers handling money show the inverse (Money 3:134, Bridge 31:245).
- **`PerpsConnectionManager`** encodes connection lifecycle in ~45 mutable fields, 6 promise
  latches and 3 generation counters — vastly more reachable states than legal ones, and a
  module-level singleton no test can instantiate cleanly.
- **`usePerpsProOrderForm.ts`** — 3,786 LOC, 123 hook calls, 60+ returned keys: correctness
  cannot be established by reading it and cannot be isolated by testing it.
- **Nine `PerpsConnectionProvider` instantiation sites** across six features, with
  `PerpsGlobalErrorGate` documented as working "regardless of how many … instances exist" — a
  compensating control for a structural problem.
- Highest timer density (0.63/kLOC) on a WebSocket surface, and 43 `console.*`.
- Its own documented rule against defaulting to `0` is broken in its largest file
  (`usePerpsProOrderForm.ts:852–860`), and its review checklist cites a `manageLifecycle` prop
  that no longer exists.

**Multichain Accounts** deserves separate mention: its defect *rate* is unremarkable, but it
owns dApp permission granting and private-key display while carrying the worst test:source
ratio (0.39), the worst assertion density (78/kLOC), the worst `eslint-disable` density
(1.98/kLOC), and **18 of its 46 test files are snapshot/render-only**. A 1,004-line
`MultichainAccountConnect.tsx` on the permission path with that verification profile is the
highest-severity-per-defect combination in the analysis.

## Most over-engineered implementation — **Predict**, with **Perps** for accidental complexity

**Predict** shows the clearest genuinely *unnecessary* abstraction. `providers/types.ts`
declares a ~40-method provider interface, yet `PredictController.ts:520` types the field as
the concrete `PolymarketProvider`, `:577` news it directly, and `POLYMARKET_PROVIDER_ID` is
hardcoded at 60+ sites. The abstraction costs maintenance and misleads readers about
pluggability while delivering none — worse than having no interface. Alongside it: a
900-line type barrel, a 2,807-line `utils.ts`, and eight mutable analytics de-duplication
collections plus nine tracking methods fused into the trading controller, making telemetry a
stateful concern of order execution.

**Perps** is better described as *accidentally* complex than over-abstracted — its
abstractions (external controller package, real provider routing) are load-bearing and
correct. Its problem is 50 files over 500 lines, three of the repo's four largest files, two
separate order-entry implementations (`PerpsOrderView` 2,464 LOC and `PerpsProOrderForm`
1,038 + a 3,786-line hook), and a hand-rolled connection state machine where a declarative
one would be smaller and safer.

## Biggest opportunities for refactoring

Ordered by (regression risk avoided + recurring cost removed) ÷ effort.

1. **Rename Bridge's `run*Cases.ts` to `*.test.ts` (+ Stake's `mockVaultRewards.ts`).**
   *Effort: hours.* 4,368 LOC of test code and 1,972 LOC of fixtures currently count as
   production code in `collectCoverageFrom`, distorting coverage and sitting in the bundle
   graph. Highest value-per-hour item in this report.
2. **Consolidate Ramp onto one implementation.** *Effort: XL.* Eliminates the repo's largest
   duplicate-fix risk on a live fiat funnel. Sequence: ban `Aggregator/` imports from the new
   tree via `no-restricted-imports` (stops the 31 edges growing), resolve them one by one,
   route all traffic to the target tree, delete `Aggregator/`.
3. **Introduce a campaign registry in Rewards.** *Effort: L.* Collapses 4 view families and
   ~20 hooks into 4 config-driven views and 5 parameterised hooks. Generic versions already
   exist — this is consolidation onto existing abstractions, not new design. Converts a fixed
   per-campaign cost into one config object and removes the silent-drift class of bug.
4. **Split `usePerpsProOrderForm.ts` (3,786 LOC / 123 hooks / 60+ keys).** *Effort: L.*
   Highest-complexity unit in the codebase, on the order-entry path. Do it as composable
   hooks; the seams are already visible in the return object's comment groupings.
5. **Convert `PerpsConnectionManager` to an explicit state machine and make it injectable.**
   *Effort: L.* Removes a whole class of stuck/duplicate-connection bugs and makes the 2,145
   LOC testable per-instance rather than as a shared global.
6. **Move `PredictController` to the core layer and decompose `placeOrder` (566 LOC).**
   *Effort: L.* Restores the layering every peer follows and makes the money-moving path
   branch-testable. Extract `PredictAnalyticsReporter` in the same pass.
7. **Raise verification on Multichain Accounts and Stake.** *Effort: M.* Both sit on
   consequential paths (permissions/keys; staking funds) with the two weakest test profiles.
   Replace snapshots with behavioural assertions on permission-set outcomes and staking
   eligibility.
8. **Unify Card's four data-access paths.** *Effort: M.* React Query for reads,
   `CardController` for writes/state, `CardSDK` demoted to transport. Merge `util/` + `utils/`
   and the three type homes in the same pass.
9. **Break the Confirmations ↔ features cycle.** *Effort: L.* 198 imports back into eight
   features, with Perps↔Confirmations a true cycle. Invert via a
   `ConfirmationTypeRegistry` and relocate `perps-confirmations/` and
   `predict-confirmations/` to their owners.
10. **Resolve Stake's status.** *Effort: M.* Promote the shared parts (`useStakingEligibility`,
    metrics utils, `StakingBalance`) into Earn or a neutral module and delete the rest, or
    formally re-own it. Unblocks Earn's duplicate input-flow refactor.
11. **Set a `coverageThreshold` in `jest.config.js`.** *Effort: hours.* Ratchet from current
    per-feature levels so coverage cannot regress. Do this *after* item 1, so the baseline is
    honest.

## Cross-feature patterns

**1. Three concurrent styling systems, with adoption inverse to feature age.**
`useTailwind()` is the documented standard, yet adoption ranges from 86 % (Rewards) to 0 %
(Stake): Ramp 3 %, Confirmations 4 %, Money 8 %, Perps 9 %, Earn 9 %, MultichainAccounts 11 %,
Bridge 30 %. Six features run all three idioms simultaneously (Perps 67/50/11, Ramp 84/52/4,
Confirmations 103/94/8). Where legacy dominates the copy-paste gradient points *away* from the
standard, so the gap widens on its own. This needs a per-folder migration plan plus a lint
rule freezing new `StyleSheet.create`, not per-PR encouragement.

**2. Confirmations is a hub with back-edges to everything.** 198 imports run from
`Views/confirmations/**` into eight UI features, while those features import Confirmations in
turn — Perps↔Confirmations (57 out / 35 back) is a genuine module cycle, and
`components/perps-confirmations/` and `components/predict-confirmations/` live in the hub
rather than their owners. Consequences: no feature can be tested or bundled independently, and
a Confirmations change can break every trading flow. This is the single most structurally
significant issue in the codebase and no feature can fix it alone.

**3. Test code and fixtures living in the production module graph.** Bridge's five
`run*Cases.ts` files (4,368 LOC, 51 `it()` blocks, importing
`@testing-library/react-native`) and Stake's `mockVaultRewards.ts` (1,972 LOC) are named
`.ts`, so `collectCoverageFrom` counts them as production code. Coverage numbers across the
repo are therefore not comparable, and test-file lint overrides don't apply. Cheap to fix,
and it should be fixed before any coverage gate is introduced.

**4. No enforced coverage floor, and quantity diverging from quality.** `jest.config.js` has
`collectCoverageFrom` and `coverageReporters` but no `coverageThreshold`. The result is a 2.2×
spread in assertion density (Card 172/kLOC → MultichainAccounts 78/kLOC) and a 2.3× spread in
test:source ratio (Rewards 0.89 → MultichainAccounts 0.39). Ratio also does not track
effectiveness: Rewards leads on ratio while mocking most heavily (6.4 `jest.mock` per test
file) and cannot detect the cross-campaign drift that is its dominant defect; Ramp (43) and
Confirmations (42) carry the most snapshot tests; 18 of MultichainAccounts' 46 test files are
snapshot-only.

**5. Float arithmetic on money paths, feature-by-feature.** The `parseFloat`:`BigNumber` ratio
varies by two orders of magnitude with no platform reason: Money 3:134, Bridge 31:245,
Confirmations 23:305 and Stake 2:84 on one side; Perps **461:154**, Predict 61:17 and Earn
76:139 on the other. The float-heavy features are the leveraged and derivative ones, where
precision matters most. There is no shared monetary type or lint rule, so each team re-decides.

**6. Feature-local controllers and data-access divergence.** The project mandates controllers
in the core layer. Most comply (Money ×4, Card, Earn, Bridge, Ramp) and two go further,
externalising to versioned packages (`@metamask/perps-controller`,
`@metamask/bridge-controller`) — the strongest pattern in the repo. Predict is the sole
outlier with a 4,724-line `BaseController` under `app/components/UI/`. Data fetching diverges
similarly: React Query in Predict (38 files) and Card (19), bespoke in Perps, Rewards, Earn
and Stake. Predict's own `docs/predict/refactoring-tasks.md` (P0 Task 5) proposes building a
*React-Query-lookalike* rather than adopting the library two peers already use — divergence
compounding into reinvention.

**7. Duplication as the default response to a new variant.** Rewards duplicates per campaign
(4 view families, ~20 hooks for 5 concepts); Ramp duplicates per implementation generation (14
files, two funnels); Earn duplicates per direction (`EarnInputView` 1,116 / `EarnWithdrawInputView`
1,022); Perps duplicates per order-entry surface (`PerpsOrderView` 2,464 vs `PerpsProOrderForm`);
Social Leaderboard duplicates per market type (`useSpotTraderPositionPrices` /
`usePerpsTraderPositionPrices`). In several cases the shared abstraction already exists and was
bypassed. This is the most-repeated smell in the analysis, and it is a review-culture signal
rather than a technical one.

**8. Documentation drifting from code — and rules that aren't controls.** Perps maintains 16
documents including a self-authored anti-pattern checklist, and Predict maintains 5 plus a
28-task debt register. Both are unusually strong practice. But Perps' checklist mandates a
`manageLifecycle` prop that exists nowhere in the codebase, and its first and most emphatic
rule ("never default to `0` when data is unavailable") is broken in its own largest file at
`usePerpsProOrderForm.ts:852–860`. Documented rules that CI does not enforce decay into
documentation. The highest-leverage response is to convert the few rules that matter most
(no `parseFloat` in monetary arithmetic; no `StyleSheet.create` in new files; no
`Aggregator/` imports; no cross-feature deep imports) into ESLint rules.
