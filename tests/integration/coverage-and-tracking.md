# Integration test coverage & bug tracking

## Coverage target

100% integration coverage is the wrong goal — diminishing returns hit hard past ~85% and the maintenance cost of the last 10–15% is rarely justified by the bugs caught. **Target per-layer, not aggregate:**

| Layer                            | Target  | Rationale                                                   |
| -------------------------------- | ------- | ----------------------------------------------------------- |
| Controllers, providers, services | 85–95%  | Highest-risk surfaces, easiest to integration-test          |
| Selectors                        | 95–100% | Every integration test reads through them, free coverage    |
| User-flow hooks (entry points)   | ~80%    | One integration test per hook covering happy path E2E       |
| Components                       | 50–70%  | Rest covered by existing CV tests for variant coverage      |
| Utilities / pure functions       | 0%      | Use unit tests; integration here is wasteful                |
| Native module wrappers           | 0%      | Can't be integration-tested; isolate and unit-test wrappers |

The point is **useful** coverage, not a number on a dashboard. Coverage % tells you a line ran during a test — it doesn't tell you the test was meaningful. Optimising for the number distorts the suite.

## Tracking what integration tests catch

The catch: bugs caught in CI never become bug tickets, so the traditional "tickets filed" count goes the wrong direction. You need separate measurement.

Three mechanisms, in order of effort:

**CI failure tagging (start here).** A jest reporter or GitHub Action posts a `caught-by-integration` label on any PR where an `*.integration.test.ts` failed. Aggregate weekly. ~½ day to set up. Gives a leading indicator: "this week N PRs were blocked before merge."

**Pre/post comparison (credible long-term metric).** Pick a baseline window (last quarter). Count bugs first discovered by e2e, QA, or production, classified as "would integration have caught this?" Run the same count after rollout. The delta is what integration prevented. Costs upfront classification work + a quarter of patience. This is the number stakeholders care about.

**Quarterly mutation testing (validation).** Once a quarter, deliberately reintroduce a known controller bug on a branch (like the perps `priceCents` example). If integration catches it, suite is genuinely defensive; if not, that's a coverage gap to fix. Half-day per quarter; keeps the suite from rotting into snapshots-2.0.

### Things that distort the metric

- `it.skip` or commented-out tests are _worse_ than no tests — the team thinks they're covered. Track skip-counts as a separate regression signal.
- Flaky failures inflate the catch count. Re-run on push, only count consistent failures.
- A failing integration test could be (a) a real bug or (b) a broken test. PR template field — `this PR fixes: [bug | broken test | feature]` — separates them cleanly.

---

## Perps at 90% integration coverage — scope estimate

Numbers based on a quick scan of `app/controllers/perps/`.

### Surface area

- **PerpsController**: 5,030 lines, ~85 methods (~30 are public actions worth integration-testing)
- **TradingService**: 9 public async methods — `placeOrder`, `editOrder`, `cancelOrder`, `cancelOrders`, `closePosition`, `closePositions`, `updatePositionTPSL`, `updateMargin`, `flipPosition`
- **HyperLiquidProvider** + **MYXProvider** + **AggregatedPerpsProvider**: 3 providers, each with order/close/validation/subscription paths
- **12 services**: AccountService, DepositService, MarketDataService, EligibilityService, RewardsIntegrationService, etc.
- Total: ~40,000 lines of code

### Test count to reach ~90%

Per trading method: happy path + 3–5 main error paths + 1 multi-step flow ≈ **5–7 tests**.

| Area                                                   | Methods × tests | Est. tests   |
| ------------------------------------------------------ | --------------- | ------------ |
| Trading flows (TradingService)                         | 9 × 6           | ~55          |
| Position management (TP/SL, margin, flip)              |                 | ~15          |
| Account / deposit / withdraw flows                     |                 | ~20          |
| Market data + subscriptions (real provider, mocked WS) |                 | ~15          |
| Multi-provider routing (Aggregated)                    |                 | ~10          |
| Cross-flow scenarios (deposit → trade → close)         |                 | ~10          |
| **Total**                                              |                 | **~120–150** |

### Effort

- First 20 tests: ~1 hour each (harness extensions for TradingService, PerpsController, multi-provider; learning curve)
- Tests 20–150: ~30 min each (harness reused, patterns established)
- Harness work: ~1 sprint upfront (extend `tests/integration/harnesses/perps.ts` to cover TradingService + full PerpsController, not just provider)

**Total: 2–3 dev weeks for the pilot, including harness work.**

### Coverage outcome

| File / area                            | Expected coverage |
| -------------------------------------- | ----------------- |
| `PerpsController.ts`                   | 85–90%            |
| `services/TradingService.ts`           | 90–95%            |
| `providers/HyperLiquidProvider.ts`     | 80–90%            |
| `providers/MYXProvider.ts`             | 80–90%            |
| `providers/AggregatedPerpsProvider.ts` | 90%               |
| Smaller services                       | 70–95% each       |

The 5–10% that stays uncovered in each file is mostly:

- Defensive error branches that require impossible state to reach
- Native-only code paths (keychain failures, real WebSocket disconnects)
- Truly dead code (revealed by the coverage exercise — delete it)

### What this buys

If perps is representative of the bug pattern across the app, ~90% integration coverage on perps should:

- Catch most reverse-position-class bugs in jest in milliseconds, not in e2e in minutes
- Reduce perps-related e2e bug discoveries by 60–80% (rough estimate; pilot will give real numbers)
- Make it safer to bump upstream perps packages (integration tests run real new code path on the bump PR)

### What it does NOT cover

- Real device behaviour (native modules, real keychain, real Reanimated)
- Actual HyperLiquid network behaviour (rate limits, real ordering)
- Real wallet signing flows

E2E still owns those. The point is shrinking e2e's job to "things that genuinely need a device," not eliminating it.
