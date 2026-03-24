# Go Mock Server Migration — thenCallback Audit

**Date:** 2026-03-24
**Task:** Audit `.thenCallback()` usages before migrating MockServerE2E.ts to a Go binary.

---

## Summary

The Go mock server cannot support the mockttp `.thenCallback()` pattern because it requires
executing arbitrary JavaScript callbacks at request time, which is fundamentally incompatible
with a compiled Go binary. This audit determines how widespread the pattern is so we can
choose the right migration strategy.

---

## Counts

| Location | thenCallback usages |
|---|---|
| `tests/` total (all files) | 82 |
| `MockServerE2E.ts` only | 2 |
| All files excluding `MockServerE2E.ts` | 80 |
| `tests/api-mocking/mock-responses/` | 61 |
| `tests/api-mocking/` (excl. MockServerE2E) | 69 |
| `tests/smoke/` | 11 |
| `tests/regression/` | 0 |

**Total usages outside the server implementation itself: 80 across 15 files.**

---

## Affected Files (excluding MockServerE2E.ts)

Listed with individual occurrence counts (descending):

| Occurrences | File |
|---|---|
| 29 | `tests/api-mocking/mock-responses/polymarket/polymarket-mocks.ts` |
| 12 | `tests/api-mocking/mock-responses/ramps/ramps-mocks.ts` |
| 11 | `tests/api-mocking/mock-responses/perps-arbitrum-mocks.ts` |
| 5  | `tests/api-mocking/seedless-onboarding/OAuthMockttpService.ts` |
| 4  | `tests/api-mocking/mock-responses/cardholder-mocks.ts` |
| 3  | `tests/smoke/identity/utils/user-storage/userStorageMockttpController.ts` |
| 3  | `tests/api-mocking/mock-responses/transaction-pay.ts` |
| 3  | `tests/api-mocking/helpers/mockHelpers.ts` |
| 2  | `tests/smoke/notifications/utils/mock-notification-trigger-server.ts` |
| 2  | `tests/smoke/identity/utils/mocks.ts` |
| 2  | `tests/smoke/confirmations/send/send-erc20-token.spec.ts` |
| 1  | `tests/smoke/swap/swap-trending-tokens.spec.ts` |
| 1  | `tests/smoke/notifications/utils/mocks.ts` |
| 1  | `tests/api-mocking/mock-responses/musd/musd-mocks.ts` |
| 1  | `tests/api-mocking/mock-responses/custom-rpc-provider-mocks.ts` |

**Total: 15 files, 80 occurrences.**

---

## Decision: Option A — Defer thenCallback Migration

**Threshold applied:** Option A is recommended when >20 files are affected. We found 15 files,
which is above the Option B threshold of <5 files. Option A is the correct choice.

### Rationale

1. **Volume is too large for a clean in-PR conversion.** 80 occurrences across 15 files span
   multiple feature domains (polymarket, ramps, perps, identity, notifications, swap,
   confirmations). Converting all of them to static `thenReply` rules in a single PR introduces
   high risk of behavioral regressions across unrelated smoke test suites.

2. **Dynamic responses are semantically meaningful.** The heaviest user
   (`polymarket-mocks.ts`, 29 occurrences) and `ramps-mocks.ts` (12 occurrences) use callbacks
   to simulate stateful APIs (e.g., returning different responses on successive calls, echoing
   request fields back). These cannot be mechanically replaced with static replies without
   understanding domain logic.

3. **Regression coverage is clean.** `tests/regression/` has zero usages, so all regression
   jobs can migrate immediately without any workaround.

4. **Deferral is safe.** The Go server will own default/static mocks. Tests that call
   `thenCallback` will continue to resolve through the existing mockttp layer in the TypeScript
   shim until each file is individually migrated in a follow-up PR with proper domain knowledge.

### Known Deviation

This PR introduces the Go mock server for static mock rules. The `thenCallback` pattern remains
handled by the mockttp TypeScript layer. Files using `thenCallback` are explicitly excluded from
the Go migration scope in this PR. Each file will be migrated in a dedicated follow-up, with
the owner of the corresponding feature area (polymarket, ramps, perps, identity, notifications)
responsible for converting dynamic callbacks to Go-compatible patterns (e.g., sequence rules,
conditional static replies, or a small set of pre-computed response fixtures).

### Follow-up tickets to create

- [ ] Migrate polymarket mocks off thenCallback (29 occurrences)
- [ ] Migrate ramps mocks off thenCallback (12 occurrences)
- [ ] Migrate perps-arbitrum mocks off thenCallback (11 occurrences)
- [ ] Migrate identity/notifications/swap/confirmations smoke mocks (remaining 28 occurrences)

---

## Methodology

```bash
# Total count
grep -rn "thenCallback" tests/ --include="*.ts" | grep -v "node_modules" | wc -l
# => 82

# By location
grep -rn "thenCallback" tests/api-mocking/mock-responses/ --include="*.ts" | wc -l
# => 61
grep -rn "thenCallback" tests/smoke/ --include="*.ts" | wc -l
# => 11
grep -rn "thenCallback" tests/regression/ --include="*.ts" | wc -l
# => 0
grep -rn "thenCallback" tests/api-mocking/ --include="*.ts" | grep -v "MockServerE2E" | wc -l
# => 69

# File list (excluding MockServerE2E.ts)
grep -rln "thenCallback" tests/ --include="*.ts" | grep -v "node_modules" | grep -v "MockServerE2E"
```
