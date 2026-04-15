---
name: performance-testing
description: Create and review E2E performance tests that measure real user flows on real devices with TimerHelper and PerformanceTracker. Use when creating, editing, or reviewing performance tests, when the user mentions perf tests, timing measurements, performance thresholds, or files in tests/performance/.
---

# E2E Performance Testing

For the full reference guide with templates, examples, and decision trees, read [reference.md](reference.md).

## Core Rules

1. **Real device, real app, real network** — zero mocking
2. **Actions OUTSIDE `measure()`, assertions INSIDE `measure()`** — measure app response time, not interactions
3. **One `TimerHelper` per measurable step** with platform-specific thresholds `{ ios: <ms>, android: <ms> }`
4. **User-centric timer descriptions**: _"Time since the user clicks X until Y is visible"_
5. **Screen Object pattern** — all UI via `wdio/screen-objects/`, never raw selectors
6. **Every screen object** must have `device` assigned before use
7. **Every test** must call `performanceTracker.addTimers()` + `performanceTracker.attachToTest(testInfo)`
8. **Performance + team tags** are mandatory on every test

## File Location

| Starting condition                     | Folder                          |
| -------------------------------------- | ------------------------------- |
| User already has wallet (login screen) | `tests/performance/login/`      |
| Fresh install (onboarding)             | `tests/performance/onboarding/` |
| Dapp connection needed                 | `tests/performance/mm-connect/` |

## Quick Template (login-based)

```js
import { test } from '../../framework/fixtures/performance';
import TimerHelper from '../../framework/TimerHelper';
import { login } from '../../framework/utils/Flows.js';
import { PerformanceLogin } from '../../tags.performance.js';

test.describe(`${PerformanceLogin}`, () => {
  test(
    'Descriptive name',
    { tag: '@team-name' },
    async ({ device, performanceTracker }, testInfo) => {
      ScreenA.device = device;
      ScreenB.device = device;

      await login(device);

      const timer = new TimerHelper(
        'Time since the user clicks X until Y is visible',
        { ios: 2000, android: 3000 },
        device,
      );

      await ScreenA.tapButton(); // action OUTSIDE
      await timer.measure(() => ScreenB.isVisible()); // assertion INSIDE

      performanceTracker.addTimers(timer);
      await performanceTracker.attachToTest(testInfo);
    },
  );
});
```

## Modifying Existing Tests

When editing an existing test in `tests/performance/`, follow these rules:

### Thresholds

- **Never tighten thresholds without baseline data** — run the test 3+ times first to collect real timings
- **Never remove thresholds** — every timer must keep `{ ios, android }` values
- **Document why** in the PR if changing a threshold (e.g., "tightened after 10 runs averaging 1.2s")
- If a test is consistently failing quality gates, **widen the threshold** rather than deleting the timer

### Adding/Removing Timers

- When adding a new timer to an existing test, register it in the existing `performanceTracker.addTimers()` call
- When removing a timer, ensure it's also removed from `addTimers()` — orphaned timers cause silent failures
- Never reduce a test to zero timers — if the flow no longer needs measurement, delete the test file

### Screen Object Changes

- If a screen object method is renamed or removed, **grep all `tests/performance/`** for usages before changing
- When adding methods to a screen object in `wdio/screen-objects/`, ensure backward compatibility — existing tests must not break
- New screen objects must follow the same `device` getter/setter pattern

### UI Flow Changes

- If the app UI changes (new screen, removed step, renamed button), update **all** perf tests that use that flow
- Re-run the affected tests to verify timers still measure the intended transition
- Update timer descriptions if the user-facing flow changed (e.g., button was renamed)

### Refactoring

- Extract shared flows into `tests/framework/utils/Flows.js` (e.g., `login`, `importSRPFlow`)
- If multiple tests duplicate the same setup, create a helper that returns `TimerHelper[]`
- Keep `screensSetup(device)` pattern for tests with many screen objects (see `perps-position-management.spec.js`)

### Code Review Checklist for Modifications

- [ ] No existing timer was accidentally removed or left unregistered
- [ ] Threshold changes are justified with data
- [ ] `attachToTest(testInfo)` is still called at the end
- [ ] All screen objects still have `device` assigned
- [ ] Timer descriptions still match the actual flow being measured
- [ ] Actions are still OUTSIDE `measure()`, assertions INSIDE

## Forbidden Patterns

- `jest.mock(...)` — no mocking
- `import { test } from 'appwright'` — always from `fixtures/performance`
- Actions inside `measure()` — only assertions/waits
- Missing `device` assignment on screen objects
- Timers without thresholds
- Missing team tag
- Hardcoded passwords — use `getPasswordForScenario()`

## Threshold Ranges

| Action type                     | iOS           | Android        |
| ------------------------------- | ------------- | -------------- |
| Simple screen transition        | 500–1500 ms   | 600–1800 ms    |
| Data loading (API + render)     | 1500–5000 ms  | 2000–7000 ms   |
| Dapp connection (cross-context) | 8000–20000 ms | 12000–30000 ms |
| Quote/swap execution            | 7000–9000 ms  | 7000–9000 ms   |

## Key References

- Full guide: [reference.md](reference.md)
- Performance fixture: `tests/framework/fixtures/performance/performance-fixture.ts`
- TimerHelper: `tests/framework/TimerHelper.ts`
- Tags: `tests/tags.performance.js`
- Flows: `tests/framework/utils/Flows.js`
- Screen objects: `wdio/screen-objects/`
- Examples: `tests/performance/login/`, `tests/performance/onboarding/`
