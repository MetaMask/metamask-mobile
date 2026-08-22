# Unlock API-call measurement (zero mocks)

Measures **how many real HTTP calls** (`fetch` / `XHR`) happen in the wallet unlock → homepage window on a **live** app build.

**Hard rule:** no Mockttp and no canned API mocks for unlock call-volume measurement or gating. If a gate needs mocks to stay green, it is the wrong tool for this problem.

This is a **call-volume** meter (in-app), not a latency gate (`TimerHelper`) and not a render gate (Reassure).

## Why in-app (not Mockttp smoke)

Mocked Appium smoke undercounts badly vs a real unlock (e.g. ~44 proxied calls vs ~140 in RN DevTools under local/dev FFs). Forced feature flags, light fixtures, and canned responses create a different measurement world. New unlock-time fetches under real FFs/data can miss that gate.

The SSOT is the same meter you see after a normal unlock on a real backend.

## What it measures

1. `Authentication.unlockWallet` starts `UnlockNetworkMeter`.
2. NitroFetch / XHR wrappers record `{ method, host, url, ts }` (no bodies/headers) while the window is active.
3. Homepage mount signals ready; the window ends after ~2.5s with no new HTTP (or a 45s max-window fallback).
4. On end: last summary is kept for Developer Options; Sentry gets `setMeasurement('unlock_http_request_count', total)`.

WebSocket frames and some native image loads may still differ from DevTools’ total — document that when comparing.

## Files

| Path                                                                                                                                                                                                 | Role                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`app/core/UnlockNetworkMeter.ts`](../../app/core/UnlockNetworkMeter.ts)                                                                                                                             | Meter + fetch/XHR hooks                                 |
| [`app/core/NitroFetchSetup.ts`](../../app/core/NitroFetchSetup.ts)                                                                                                                                   | Installs transport on real builds (`!hasTestOverrides`) |
| [`app/core/Authentication/Authentication.ts`](../../app/core/Authentication/Authentication.ts)                                                                                                       | Starts window on unlock                                 |
| [`app/components/Views/Homepage/hooks/useUnlockNetworkMeterEnd.ts`](../../app/components/Views/Homepage/hooks/useUnlockNetworkMeterEnd.ts)                                                           | Homepage ready + accessibility probe                    |
| [`app/components/Views/Settings/DeveloperOptions/UnlockNetworkMeterDeveloperOptionsSection.tsx`](../../app/components/Views/Settings/DeveloperOptions/UnlockNetworkMeterDeveloperOptionsSection.tsx) | Local dump + copy JSON                                  |
| [`tests/performance/budgets/wallet-unlock-api-calls.json`](../../tests/performance/budgets/wallet-unlock-api-calls.json)                                                                             | Real-network performance budget                         |
| [`tests/performance/login/wallet-unlock-api-call-budget.spec.ts`](../../tests/performance/login/wallet-unlock-api-call-budget.spec.ts)                                                               | Performance E2E assert (zero Mockttp)                   |

## Local workflow (primary)

Use a normal Expo/dev or release build that talks to **live** backends.

1. Run with `METAMASK_ENVIRONMENT=dev` so remote FFs map to LaunchDarkly **Development** (same world as day-to-day unlock).
2. Unlock the wallet the way you usually do.
3. Open **Settings → Developer options → Unlock HTTP meter**.
4. Wait until status shows **Last unlock: N HTTP requests**.
5. **Copy unlock HTTP summary JSON** and diff hosts in PRs when intentionally changing unlock fan-out.

Expect totals in the DevTools Network ballpark (~140 for a full homepage unlock), not the old mocked smoke number.

## Sentry

On window end the app emits:

```ts
setMeasurement('unlock_http_request_count', total, 'none');
```

Use this for trends; local Developer Options remain the source of truth for host breakdowns.

## Performance E2E gate (real network)

Playwright performance builds already run with live network (`HAS_TEST_OVERRIDES` false — NitroFetch installed). The unlock API budget spec:

1. Logs in / unlocks on a real device/emulator.
2. Waits for the Homepage accessibility probe (`unlock-network-meter-summary`) whose label is the JSON summary.
3. Asserts `total ≤ totalMax` (and optional host ceilings) from `tests/performance/budgets/wallet-unlock-api-calls.json`.

**No Appium smoke Mockttp.** Absolute counts can move with backend/LD; re-baseline the JSON when intentional.

Bootstrap mode: empty `hosts: {}` enforces only `totalMax`.

## Feature-flag environment mapping

| Build / env                      | Typical FF environment                 |
| -------------------------------- | -------------------------------------- |
| Local `METAMASK_ENVIRONMENT=dev` | LaunchDarkly Development               |
| Performance / e2e builds         | Test (unless later pointed at prod/rc) |

Local v1 should match your **dev** unlock. Perf CI may differ slightly until FF env is aligned.

## Reducing the number over time

1. Keep the real-network meter / perf budget from growing accidentally.
2. Use Developer Options host dumps + RN DevTools to prioritize.
3. Delete redundant unlock-time calls (see e.g. [ADR-0001](../decisions/0001-perps-homepage-hyperliquid-calls.md)).
4. Lower `totalMax` / host ceilings in dedicated PRs after measuring a real unlock.
