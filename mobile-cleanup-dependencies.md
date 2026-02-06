# Perps Controller Dependency Cleanup — Progress Tracker

> **Goal**: Make `controllers/` fully portable so it can be published as `@metamask/perps-controller` without any Mobile-specific imports. Per ADR-041, Mobile is the source of truth; the sync script simply copies `controllers/`.

---

## PR 1: Move constants + types + portable utils ✅

All items completed and verified (tests passing, TypeScript clean).

### Constants → `controllers/constants/`

- [x] `hyperLiquidConfig.ts` — moved (no external deps)
- [x] `transactionsHistoryConfig.ts` — moved (no imports)
- [x] `eventNames.ts` — moved (no imports)
- [x] `orderTypes.ts` — moved (no imports)
- [x] `chartConfig.ts` — **split**: portable enums/calculations in `controllers/constants/chartConfig.ts`, UI parts (`PERPS_CHART_CONFIG`, `getCandlestickColors`, `CHART_INTERVALS`, `TIME_DURATIONS`) stay in `constants/chartConfig.ts`
- [x] `perpsConfig.ts` — **split**: portable constants in `controllers/constants/perpsConfig.ts`, Mobile-only (`PERPS_BALANCE_*`, `isTokenTrustworthyForPerps`) stay in `constants/perpsConfig.ts`
- [x] `controllers/constants/index.ts` — barrel re-export created

### Types → `controllers/types/`

- [x] `transactionTypes.ts` — moved (no imports)
- [x] `config.ts` — moved (only `@metamask/utils`)
- [x] `hyperliquid-types.ts` — moved (only `@nktkas/hyperliquid` types)
- [x] `perps-types.ts` — moved (imports resolve within controllers/)
- [x] `token.ts` — **Fix 2 applied**: replaced `BridgeToken` alias with independent `PerpsToken` interface using `@metamask/assets-controllers` + `@metamask/utils`
- [x] `controllers/types/index.ts` — **Fix 3 applied**: `WebSocketConnectionState` enum defined inline (was importing from Mobile-only `HyperLiquidClientService`)
- [x] `controllers/types/index.ts` — **Fix 10 applied**: removed `export * from '../../types/navigation'` (Mobile-only)

### Utils → `controllers/utils/`

- [x] `standaloneInfoClient.ts` — moved
- [x] `hyperLiquidAdapter.ts` — moved (imports `significantFigures` locally)
- [x] `orderCalculations.ts` — moved
- [x] `hyperLiquidValidation.ts` — moved
- [x] `accountUtils.ts` — moved
- [x] `idUtils.ts` — moved
- [x] `stringParseUtils.ts` — moved
- [x] `wait.ts` — moved
- [x] `significantFigures.ts` — **extracted** from `formatUtils.ts` (`countSignificantFigures`, `roundToSignificantFigures`, `hasExceededSignificantFigures`)
- [x] `sortMarkets.ts` — **extracted** `parseVolume` from `hooks/usePerpsMarkets.ts`, combined with sort logic
- [x] `marketUtils.ts` — **split**: portable pattern-matching + display functions in controllers/, badge/icon functions stay in `utils/marketUtils.ts`

### Import path updates

- [x] All files inside `controllers/` updated: `../../constants/X` → `../constants/X`, `../../utils/X` → `../utils/X`, `../../types/X` → `../types/X`
- [x] Re-export stubs left at all original locations for backward compatibility (no blast radius)
- [x] `utils/orderBookGrouping.ts` — **Fix 1 applied**: import changed from hooks to `controllers/types`
- [x] `services/HyperLiquidClientService.ts` — updated to import `WebSocketConnectionState` from `controllers/types`
- [x] `hooks/usePerpsMarkets.ts` — updated to import `parseVolume` from `controllers/utils/sortMarkets`
- [x] `utils/formatUtils.ts` — updated to re-import significant figures functions from `controllers/utils/significantFigures`

### Tests

- [x] `yarn jest app/components/UI/Perps/ --no-coverage --passWithNoTests` — all passing
- [x] `yarn tsc --noEmit` — clean

---

## PR 2: Dependency injection + remove re-export stubs ✅

Both utils made portable via dependency injection, moved to `controllers/utils/`, and re-export stubs removed.

### Fix 4: `rewardsUtils.ts` — inject logger ✅

- [x] Removed `import Logger from '../../../../util/Logger'`
- [x] Added optional `logger?: PerpsLogger` param (reuses `PerpsLogger` interface from `controllers/types`)
- [x] Guard calls: `logger?.error(ensureError(error), {...})`
- [x] Moved to `controllers/utils/rewardsUtils.ts`
- [x] **Stub removed** — all consumers updated to import directly from `controllers/utils/rewardsUtils`

### Fix 6: `marketDataTransform.ts` — inject formatters ✅

- [x] Removed Mobile-specific imports (`getIntlNumberFormatter`, `formatVolume`, `formatPerpsFiat`, `PRICE_RANGES_UNIVERSAL`)
- [x] Defined `MarketDataFormatters` interface in `controllers/types`
- [x] Injected formatters as parameter to `transformMarketData` and `formatChange`
- [x] Moved to `controllers/utils/marketDataTransform.ts`
- [x] **Stub removed** — replaced with `utils/mobileMarketDataFormatters.ts` (mobile wrapper that injects formatters)

### Remove re-export stubs ✅

Deleted stubs and updated all import paths to point directly at `controllers/utils/`:

**Deleted:**

- `utils/rewardsUtils.ts` (9-line pure re-export)
- `utils/marketDataTransform.ts` (~80-line wrapper)

**Created:**

- `utils/mobileMarketDataFormatters.ts` — mobile-specific wrapper that injects `mobileFormatters` into the portable `transformMarketData`, `formatChange`, `formatPercentage`; re-exports `calculateOpenInterestUSD` and `HyperLiquidMarketData`

**Import path updates:**

| File                                                    | Change                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `hooks/usePerpsOrderFees.ts`                            | `../utils/rewardsUtils` → `../controllers/utils/rewardsUtils`                      |
| `hooks/usePerpsCloseAllCalculations.ts`                 | `../utils/rewardsUtils` → `../controllers/utils/rewardsUtils`                      |
| `hooks/usePerpsRewardAccountOptedIn.ts`                 | `../utils/rewardsUtils` → `../controllers/utils/rewardsUtils`                      |
| `hooks/usePerpsRewardAccountOptedIn.test.ts`            | `../utils/rewardsUtils` → `../controllers/utils/rewardsUtils` (import + jest.mock) |
| `Views/PerpsTransactionsView/PerpsTransactionsView.tsx` | `../../utils/rewardsUtils` → `../../controllers/utils/rewardsUtils`                |
| `controllers/providers/HyperLiquidProvider.ts`          | `../../utils/marketDataTransform` → `../../utils/mobileMarketDataFormatters`       |
| `services/HyperLiquidSubscriptionService.ts`            | `../utils/marketDataTransform` → `../controllers/utils/marketDataTransform`        |
| `utils/marketDataTransform.test.ts`                     | `./marketDataTransform` → `./mobileMarketDataFormatters`                           |
| `utils/rewardsUtils.test.ts`                            | `./rewardsUtils` → `../controllers/utils/rewardsUtils`                             |

### Tests ✅

- [x] `npx jest app/components/UI/Perps/ --no-coverage --passWithNoTests` — 250/251 pass (1 pre-existing failure in `hyperLiquidValidation.test.ts`)
- [x] `npx tsc --noEmit` — clean
- [x] `npx eslint` on all modified files — 0 errors (1 pre-existing warning)

---

## PR 3: Abstract Mobile services + controller import fixes (future)

These are deeper changes — service classes imported by controllers need to be abstracted behind interfaces and injected via constructor/`PerpsPlatformDependencies`.

### Fix 5: `PerpsController.ts` — remove non-portable imports

- [ ] `addTransaction` from `../../../../util/transaction-controller` → replace with `this.messenger.call('TransactionController:addTransaction', ...)` (messenger already configured — `TransactionControllerAddTransactionAction` is in `AllowedActions` and the messenger delegation is wired up)
- [ ] `PerpsStreamChannelKey` from `../providers/PerpsStreamManager` → define string literal type in `controllers/types/`
- [ ] `AssetType` from `../../../Views/confirmations/types/token` → define minimal type alias in `controllers/types/`

### Fix 7: `HyperLiquidProvider.ts` — abstract service classes

- [ ] Replace direct imports of 4 service classes from `../../services/` with interfaces in `controllers/types/`
- [ ] Inject via constructor instead of direct instantiation
- [ ] Replace `PerpsStreamManager` import with interface

### Fix 8: `FeatureFlagConfigurationService.ts` — inject feature flag utils

- [ ] `validatedVersionGatedFeatureFlag` / `isVersionGatedFeatureFlag` from `remoteFeatureFlag` → inject via `PerpsPlatformDependencies`

### Fix 9: `DepositService.ts` — inject transfer data generator

- [ ] `generateTransferData` from Mobile utils → inject via `PerpsPlatformDependencies`

### Tests

- [ ] All Perps tests pass
- [ ] TypeScript clean
- [ ] Verify: `grep -r "from '\.\./\.\./\.\./\.\." app/components/UI/Perps/controllers/ --include='*.ts' --exclude='*.test.ts'` returns no results (except `ensureError`)

---

## Learnings & Decisions

### Pattern: re-export stubs for backward compatibility

Every file moved into `controllers/` gets a thin stub left at the original path:

```typescript
export * from '../controllers/constants/eventNames';
```

This prevents a blast radius of 100+ import changes across Mobile. Consumers can migrate at their own pace.

### Pattern: SPLIT files for mixed portable/UI content

Files like `chartConfig.ts`, `perpsConfig.ts`, `marketUtils.ts`, and `formatUtils.ts` have both portable and Mobile-specific exports. The portable parts move to `controllers/`, the Mobile-specific parts stay, and the original file re-exports the portable parts for backward compat.

### Decision: `PerpsToken` defined independently (not aliased to `BridgeToken`)

`types/token.ts` previously aliased `BridgeToken` from `../../Bridge/types`. Since `@metamask/assets-controllers` provides the building blocks (`Asset`, `TokenRwaData`), we defined `PerpsToken` as a standalone interface with the same shape. This breaks the Mobile-only dependency while maintaining type compatibility.

### Decision: `WebSocketConnectionState` inlined in controller types

Rather than importing from `services/HyperLiquidClientService` (Mobile-only), the enum is defined directly in `controllers/types/index.ts`. The service now imports from controller types instead.

### Decision: `parseVolume` extracted from hook into `controllers/utils/sortMarkets.ts`

The `parseVolume` function was defined inside `hooks/usePerpsMarkets.ts` (a React hook file). Since it's pure logic needed by `sortMarkets`, it was extracted into the portable `controllers/utils/sortMarkets.ts`. The hook now imports it from there.

### Decision: `significantFigures` extracted from `formatUtils.ts`

Three pure math functions (`countSignificantFigures`, `roundToSignificantFigures`, `hasExceededSignificantFigures`) were extracted into `controllers/utils/significantFigures.ts` since `formatUtils.ts` itself can't move (it has i18n/intl dependencies). `hyperLiquidAdapter.ts` (now in controllers/) imports from the extracted file.

### Decision: Remove re-export stubs, not keep them indefinitely

After PR 1 left re-export stubs for backward compatibility, PR 2 removed them for `rewardsUtils` and `marketDataTransform`. The stubs added unnecessary indirection. For `marketDataTransform`, the stub was more than a re-export — it contained mobile formatter injection logic. This was extracted into a new file `utils/mobileMarketDataFormatters.ts` with a clear name indicating its purpose, rather than keeping the generic `marketDataTransform.ts` name at the old location. Pure-function consumers (like `HyperLiquidSubscriptionService`) now import directly from `controllers/utils/marketDataTransform`.

### Decision: `addTransaction` uses messenger pattern, NOT dependency injection

`PerpsController.ts` imports `addTransaction` from `../../../../util/transaction-controller` (a Mobile-only convenience wrapper around `Engine.context.TransactionController.addTransaction()`). This is a **cross-controller call**, not a platform utility — it should use the **messenger pattern**, not `PerpsPlatformDependencies`. The messenger is already wired up: `TransactionControllerAddTransactionAction` is in `AllowedActions` (line 678) and the delegation is configured. The controller already uses `this.messenger.call('TransactionController:addTransaction', ...)` in `submitTransaction`. Fix: remove the import and replace remaining usages with the messenger call.

---

## Remaining non-portable imports in `controllers/`

After PR 1, these imports inside `controllers/` still reference Mobile-specific code:

| File                                          | Import                                                                                                | Fix                                                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `PerpsController.ts`                          | `addTransaction` from `../../../../util/transaction-controller`                                       | PR 3 — replace with `this.messenger.call('TransactionController:addTransaction', ...)` (messenger already configured) |
| `PerpsController.ts`                          | `PerpsStreamChannelKey` from `../providers/PerpsStreamManager`                                        | PR 3 — define in `controllers/types/`                                                                                 |
| `PerpsController.ts`                          | `AssetType` from `../../../Views/confirmations/types/token`                                           | PR 3 — define in `controllers/types/`                                                                                 |
| `providers/HyperLiquidProvider.ts`            | 4 service classes from `../../services/`                                                              | PR 3 — abstract behind interfaces                                                                                     |
| `providers/HyperLiquidProvider.ts`            | `PerpsStreamManager` from `../../providers/PerpsStreamManager`                                        | PR 3 — abstract behind interface                                                                                      |
| `services/FeatureFlagConfigurationService.ts` | `remoteFeatureFlag` utils                                                                             | PR 3 — inject via `PerpsPlatformDependencies`                                                                         |
| `services/DepositService.ts`                  | `generateTransferData` from Mobile utils                                                              | PR 3 — inject via `PerpsPlatformDependencies`                                                                         |
| `services/RewardsIntegrationService.ts`       | `rewardsUtils` — ✅ resolved (imports from `../utils/rewardsUtils` within controllers/)               | PR 2 ✅                                                                                                               |
| `services/MarketDataService.ts`               | `marketDataTransform` — ✅ resolved (imports from `../utils/marketDataTransform` within controllers/) | PR 2 ✅                                                                                                               |

---

## Verification Commands

```bash
# Run Perps tests
yarn jest app/components/UI/Perps/ --no-coverage --passWithNoTests

# TypeScript check
yarn tsc --noEmit

# After all 3 PRs — verify controllers/ is self-contained:
grep -r "from '\.\./\.\./\.\./\.\." app/components/UI/Perps/controllers/ \
  --include='*.ts' --exclude='*.test.ts' \
  | grep -v 'errorUtils'
# Should return NO results
```

---

## Target Structure (after all PRs)

```
controllers/
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
│   └── orderTypes.ts
├── types/
│   ├── index.ts                    ← WebSocketConnectionState inline, no navigation
│   ├── perps-types.ts
│   ├── hyperliquid-types.ts
│   ├── config.ts
│   ├── token.ts                    ← independent PerpsToken
│   └── transactionTypes.ts
├── utils/
│   ├── accountUtils.ts
│   ├── hyperLiquidAdapter.ts
│   ├── hyperLiquidValidation.ts
│   ├── idUtils.ts
│   ├── marketDataTransform.ts      ← PR 2: injected formatters
│   ├── marketUtils.ts              ← portable functions only
│   ├── orderCalculations.ts
│   ├── rewardsUtils.ts             ← PR 2: injected logger
│   ├── significantFigures.ts       ← extracted from formatUtils
│   ├── sortMarkets.ts              ← with parseVolume
│   ├── standaloneInfoClient.ts
│   ├── stringParseUtils.ts
│   └── wait.ts
├── aggregation/
├── providers/
├── routing/
└── services/
```
