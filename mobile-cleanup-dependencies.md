# Perps Controller Portability — Migration Guide

> **Goal**: Make `controllers/` fully portable so it can be published as `@metamask/perps-controller` without any Mobile-specific imports. Per ADR-041, Mobile is the source of truth; the sync script simply copies `controllers/`.

> **Outcome**: Zero runtime imports in `controllers/` reach outside its boundary (excluding test files). Two type-only imports remain by design:
>
> - `PerpsNavigationParamList` from `../../types/navigation` — erased at compile time
> - `RemoteFeatureFlagControllerState` from `@metamask/remote-feature-flag-controller` — **type-only** imports for the messenger contract (runtime access already uses `messenger.call('RemoteFeatureFlagController:getState')` and `messenger.subscribe('RemoteFeatureFlagController:stateChange', ...)`)

---

## Step 1 — Move portable constants, types, and utils into controllers/

**Commit**: `446c01667e` — _refactor(perps): move portable constants, types, and utils into controllers/_

This is the bulk data-move. Every platform-independent constant, type definition, and utility function gets a home inside `controllers/`.

### What it does

1. **Constants** — Copies portable constant files into `controllers/constants/` (eventNames, hyperLiquidConfig, orderTypes, transactionsHistoryConfig). For files with mixed content (`chartConfig.ts`, `perpsConfig.ts`), only the portable subset moves — enums and pure calculations go to `controllers/`, while UI-specific parts (colors, React Native config) stay at the original location.

2. **Types** — Moves `transactionTypes.ts`, `config.ts`, `hyperliquid-types.ts`, and `perps-types.ts` into `controllers/types/`. For `token.ts`, instead of aliasing `BridgeToken` (which would pull in a Mobile-only import), an independent `PerpsToken` interface is defined using `@metamask/assets-controllers` primitives. `WebSocketConnectionState` is inlined in `controllers/types/index.ts` rather than imported from the Mobile-only `HyperLiquidClientService`.

3. **Utils** — Moves pure-logic utilities (accountUtils, hyperLiquidAdapter, orderCalculations, hyperLiquidValidation, idUtils, stringParseUtils, wait, standaloneInfoClient). Some require extraction: `significantFigures.ts` is carved out of `formatUtils.ts` (which can't move due to i18n deps), and `parseVolume` is extracted from the `usePerpsMarkets` hook into `sortMarkets.ts`. `marketUtils.ts` is split — portable pattern-matching functions go to `controllers/`, badge/icon functions stay.

4. **Re-export stubs** — Every moved file gets a thin re-export stub at its original path (`export * from '../controllers/constants/eventNames'`). This prevents a blast radius of 100+ import changes across Mobile — consumers can migrate at their own pace.

5. **Import rewrites inside controllers/** — All internal references change: `../../constants/X` → `../constants/X`, `../../types/X` → `../types/X`, etc.

### Key files (48 changed)

Destinations created: `controllers/constants/`, `controllers/types/`, `controllers/utils/` with barrel exports.

---

## Step 2 — Remove re-export stubs, update imports to controllers/utils/

**Commit**: `991b690d6b` — _refactor(perps): remove re-export stubs, update imports to controllers/utils/_

Step 1 left re-export stubs everywhere. This step removes the ones that were more than simple pass-throughs and cleans up two files that had entangled Mobile logic.

### What it does

1. **Move `rewardsUtils.ts`** into `controllers/utils/` — the function already had no Mobile-specific logic. The Mobile `Logger` dependency is replaced with an injected `logger?: PerpsLogger` parameter. Callers outside `controllers/` pass `Logger` explicitly.

2. **Move `marketDataTransform.ts`** into `controllers/utils/` — this was the trickiest file. It used `getIntlNumberFormatter`, `formatVolume`, `formatPerpsFiat`, and `PRICE_RANGES_UNIVERSAL` from Mobile's `formatUtils`. These are replaced with an injected `MarketDataFormatters` interface. A new `utils/mobileMarketDataFormatters.ts` file provides the concrete Mobile implementation.

3. **Delete stubs** for `rewardsUtils` and `marketDataTransform` — they were more than simple re-exports (they contained Mobile formatter injection logic), so replacing them with a clearly-named `mobileMarketDataFormatters.ts` is cleaner than keeping indirect stubs.

4. **Update external consumers** — hooks like `usePerpsCloseAllCalculations`, `usePerpsOrderFees`, and `usePerpsRewardAccountOptedIn` are updated to import from `controllers/utils/` directly.

### Key decision

Stubs that are more than one-line re-exports should be removed, not kept. When a stub contains logic (like formatter injection), extract that logic into a file with a clear name indicating its purpose.

---

## Step 3 — Abstract mobile services, make controllers/ fully portable

**Commit**: `b6f3554fc1` — _refactor(perps): abstract mobile services, make controllers/ fully portable_

At this point, `controllers/` still imports a few Mobile-specific services directly. This step introduces a thin dependency-injection boundary via `PerpsPlatformDependencies`.

### What it does

1. **Define `PerpsPlatformDependencies`** in `controllers/types/index.ts` — an interface listing everything the controller needs from the host platform (logger, transaction submission, feature flags, etc.).

2. **Create `adapters/mobileInfrastructure.ts`** — the concrete Mobile implementation that wires up `Engine.context`, `Logger`, and other Mobile singletons behind the `PerpsPlatformDependencies` interface.

3. **Update `PerpsController.ts`** — accepts `PerpsPlatformDependencies` instead of reaching for Mobile globals. The `addTransaction` import (previously from `../../../../util/transaction-controller`) is replaced by the messenger pattern that was already wired up (`TransactionControllerAddTransactionAction` in `AllowedActions`).

4. **Update `DepositService.ts` and `FeatureFlagConfigurationService.ts`** — these had direct Mobile imports that are now passed through the platform dependencies.

5. **Add `transferData.ts`** to `controllers/utils/` — previously relied on a Mobile utility, now self-contained.

### Key decision

Moving services behind interfaces was considered but rejected as over-engineering. The HyperLiquid services aren't platform-specific — they're implementation details of the HyperLiquid provider. Only truly platform-specific concerns (logging, transactions, i18n formatting) use dependency injection.

---

## Step 4 — Move HyperLiquid services and orderBookProcessor into controllers/

**Commit**: `705ad94dd4` — _refactor(perps): move HyperLiquid services and orderBookProcessor into controllers/_

With the DI boundary in place, the HyperLiquid services can move wholesale into `controllers/services/`.

### What it does

1. **Move 4 service files**: `HyperLiquidClientService`, `HyperLiquidSubscriptionService`, `HyperLiquidWalletService`, `TradingReadinessCache` — each with its test file.

2. **Move `hyperLiquidOrderBookProcessor.ts`** from `utils/` to `controllers/utils/`.

3. **Add `marketDataFormatters`** to `PerpsPlatformDependencies` — number formatting (`formatVolume`, `formatPerpsFiat`, `formatPercentage`) is platform-specific due to i18n, so it's injected from `mobileInfrastructure.ts`.

4. **Keep one re-export stub**: `services/TradingReadinessCache.ts` — still consumed by `PerpsConnectionManager.ts` (outside `controllers/`). All other stubs are deleted immediately since they had no consumers.

5. **Update `HyperLiquidProvider.ts`** — all service imports are now internal to `controllers/`.

### Key decision

Only keep re-export stubs when there are actual consumers. Check `grep` before creating stubs — 4 out of 5 planned stubs were deleted immediately because nothing imported from the original paths.

---

## Step 5 — Copy ensureError + move PerpsMeasurementName into controllers/

**Status**: Uncommitted (staged changes)

The final two portability gaps: `ensureError` imported from `app/util/errorUtils.ts`, and `PerpsMeasurementName` imported from `constants/performanceMetrics.ts`.

### What it does

1. **Copy `ensureError`** into `controllers/utils/errorUtils.ts` — a 25-line pure utility with zero dependencies. The original stays in `app/util/errorUtils.ts` (used by 8+ files outside the Perps feature). Copying is better than moving because those other files are outside our refactor scope.

2. **Update 13 files** inside `controllers/` to import from the local `errorUtils` instead of `../../../../util/errorUtils`.

3. **Move `performanceMetrics.ts`** (the `PerpsMeasurementName` enum) into `controllers/constants/`. Leave a re-export stub at the original location for external consumers.

4. **Update `controllers/constants/index.ts`** barrel to include `PerpsMeasurementName`.

---

## Verification

```bash
# Run Perps tests
yarn jest app/controllers/perps/ --no-coverage --passWithNoTests
yarn jest app/components/UI/Perps/ --no-coverage --passWithNoTests

# Engine tests
yarn jest app/core/Engine/controllers/perps-controller/ --no-coverage --passWithNoTests

# TypeScript check
yarn tsc --noEmit

# Verify no relative imports into controllers/perps/ from outside (should return 0):
grep -r "from '.*controllers/perps" app/ --include='*.ts' --include='*.tsx' \
  | grep -v 'node_modules' | grep -v '@metamask/perps-controller'

# Verify controllers/ is self-contained — should return NO results:
grep -r "from '\.\./\.\./\.\./\.\." app/controllers/perps/ \
  --include='*.ts' --exclude='*.test.ts'
```

---

## Final Directory Structure

```
app/controllers/perps/    (aliased as @metamask/perps-controller)
├── PerpsController.ts
├── index.ts
├── perpsErrorCodes.ts
├── selectors.ts
├── utils.ts
├── constants/
│   ├── index.ts
│   ├── hyperLiquidConfig.ts
│   ├── perpsConfig.ts              ← portable constants only
│   ├── transactionsHistoryConfig.ts
│   ├── eventNames.ts
│   ├── chartConfig.ts              ← enums + pure calcs, NO Colors/UI
│   ├── orderTypes.ts
│   └── performanceMetrics.ts       ← PerpsMeasurementName enum
├── types/
│   ├── index.ts                    ← WebSocketConnectionState inline, PerpsPlatformDependencies
│   ├── perps-types.ts
│   ├── hyperliquid-types.ts
│   ├── config.ts
│   ├── token.ts                    ← independent PerpsToken (not aliased to BridgeToken)
│   └── transactionTypes.ts
├── utils/
│   ├── accountUtils.ts
│   ├── errorUtils.ts               ← ensureError (copied from app/util/)
│   ├── hyperLiquidAdapter.ts
│   ├── hyperLiquidOrderBookProcessor.ts
│   ├── hyperLiquidValidation.ts
│   ├── idUtils.ts
│   ├── marketDataTransform.ts      ← injected MarketDataFormatters
│   ├── marketUtils.ts              ← portable functions only
│   ├── orderCalculations.ts
│   ├── rewardsUtils.ts             ← injected PerpsLogger
│   ├── significantFigures.ts       ← extracted from formatUtils
│   ├── sortMarkets.ts              ← with parseVolume extracted from hook
│   ├── standaloneInfoClient.ts
│   ├── stringParseUtils.ts
│   ├── transferData.ts
│   └── wait.ts
├── aggregation/
├── providers/
├── routing/
└── services/
    ├── AccountService.ts
    ├── DataLakeService.ts
    ├── DepositService.ts
    ├── EligibilityService.ts
    ├── FeatureFlagConfigurationService.ts
    ├── HyperLiquidClientService.ts
    ├── HyperLiquidSubscriptionService.ts
    ├── HyperLiquidWalletService.ts
    ├── MarketDataService.ts
    ├── RewardsIntegrationService.ts
    ├── ServiceContext.ts
    ├── TradingReadinessCache.ts
    └── TradingService.ts
```

---

## Learnings & Decisions (Reference)

### Pattern: Re-export stubs for backward compatibility

Every file moved into `controllers/` gets a thin stub left at the original path (`export * from '../controllers/constants/eventNames'`). This prevents a blast radius of 100+ import changes across Mobile. But only keep stubs when there are actual consumers — check with `grep` before creating them.

### Pattern: Split files for mixed portable/UI content

Files like `chartConfig.ts`, `perpsConfig.ts`, `marketUtils.ts`, and `formatUtils.ts` have both portable and Mobile-specific exports. The portable parts move to `controllers/`, the Mobile-specific parts stay, and the original file re-exports the portable parts for backward compat.

### Pattern: Dependency injection only for truly platform-specific concerns

Don't abstract everything behind interfaces. The HyperLiquid services are implementation details of the provider, not platform-specific code — they moved wholesale. Only logging (`PerpsLogger`), number formatting (`MarketDataFormatters`), and transaction submission use DI via `PerpsPlatformDependencies`.

### Decision: `PerpsToken` defined independently (not aliased to `BridgeToken`)

`types/token.ts` previously aliased `BridgeToken` from `../../Bridge/types`. Since `@metamask/assets-controllers` provides the building blocks, `PerpsToken` is defined as a standalone interface with the same shape.

### Decision: `WebSocketConnectionState` inlined in controller types

Rather than importing from `services/HyperLiquidClientService` (Mobile-only at the time), the enum is defined directly in `controllers/types/index.ts`. The service now imports from controller types instead.

### Decision: `ensureError` copied rather than moved

Used by 8+ files outside `controllers/`. Copying the 25-line pure function avoids touching files outside the Perps refactor scope.

### Decision: `addTransaction` uses messenger pattern, NOT dependency injection

`PerpsController.ts` already had `TransactionControllerAddTransactionAction` in `AllowedActions`. The messenger call replaces the Mobile-only convenience wrapper — this is a cross-controller call, not a platform utility.

---

## Step 6 — Migrate all imports to alias + move controllers/ to app/controllers/perps/

**Status**: Uncommitted (staged changes)

The portability refactor is complete, but controllers/ still lived inside the UI component tree at `app/components/UI/Perps/controllers/`. This step migrates all ~230 external consumers to the `@metamask/perps-controller` alias and physically moves the directory for stronger isolation.

### What it does

1. **Phase 0 — Fix internal imports**: `PerpsController.ts` and `selectors.ts` had 11 imports going through re-export stubs outside controllers/ (e.g. `from '../constants/perpsConfig'`). These are rewritten to internal relative paths (`from './constants/perpsConfig'`).

2. **Phase 1 — Migrate all external imports**: A mechanical transformation of ~230 files, replacing every relative import path containing `controllers/` with the `@metamask/perps-controller` alias. This covers hooks, views, components, utils, mocks, test files, Engine consumers, DeeplinkManager, and test/ directory files. Re-export stubs are also updated (`export * from '@metamask/perps-controller/constants/eventNames'`).

3. **Phase 2 — Physical move**: `git mv app/components/UI/Perps/controllers app/controllers/perps`. All 4 config files updated to point to the new location. Internal references that broke after the move are fixed:
   - `index.ts`: hooks re-export → `../../components/UI/Perps/hooks`
   - `types/index.ts`: navigation type → `../../../components/UI/Perps/types/navigation`
   - `PerpsController.test.ts`: mock imports → `../../components/UI/Perps/__mocks__/*`, Engine → `../../core/Engine`
   - 14 service/provider test files: mock imports → `../../../components/UI/Perps/__mocks__/*`

4. **Phase 3 — ESLint rule**: Added `import/no-restricted-paths` override in `.eslintrc.js` that prevents any file outside `app/controllers/perps/` from importing it with a relative path. Internal files are exempted via `excludedFiles`.

### Key decision

Moving to `app/controllers/perps/` (outside the Perps UI tree) makes the boundary physical, not just logical. The ESLint rule enforces the alias convention going forward, so no new relative imports can slip in.

---

## Path alias: `@metamask/perps-controller` → app/controllers/perps/

The TypeScript/Metro/Jest/Babel path alias maps `@metamask/perps-controller` to `app/controllers/perps/`. All external consumers use this alias. When the real package ships to the core monorepo, only the alias config is removed — zero import changes needed.

**Files configured:**

- `tsconfig.json` — `paths`: `"@metamask/perps-controller": ["./app/controllers/perps"]`
- `metro.config.js` — `resolver.extraNodeModules`: `path.resolve(__dirname, 'app/controllers/perps')`
- `babel.config.js` — `babel-plugin-module-resolver` alias: `'./app/controllers/perps'`
- `jest.config.js` — `moduleNameMapper`: `'<rootDir>/app/controllers/perps'`

**Convention:** Internal controllers/ imports stay as relative paths (standard npm package practice). Only external consumers use the `@metamask/perps-controller` alias.

**ESLint enforcement:** `import/no-restricted-paths` in `.eslintrc.js` blocks relative imports into `app/controllers/perps/` from outside. Internal files are exempt.

### Future work

- Create the actual `@metamask/perps-controller` package in the core monorepo
- Set up the sync script (ADR-041) to copy controllers/ → core package
- Remove re-export stubs once all Mobile consumers import from the alias directly
