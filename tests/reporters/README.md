# Performance Reporters

Architecture for the performance test reporting system.

## File Structure

```
tests/reporters/
├── PerformanceReporter.ts              # Main Playwright reporter (entry point)
├── PerformanceTracker.ts               # Timer management + metrics attachment
├── types.ts                            # Shared TypeScript types
├── providers/
│   ├── SessionDataEnricher.ts          # Interface for provider-agnostic enrichment
│   └── testmu/
│       └── TestMuAIEnricher.ts         # TestMu: video URLs, profiling, network logs
├── generators/
│   ├── HtmlReportGenerator.ts          # HTML report generation
│   ├── CsvReportGenerator.ts           # CSV report generation
│   └── JsonReportGenerator.ts          # JSON device reports + per-scenario app profiling + failed-tests-by-team
└── utils/
    ├── DeviceInfoExtractor.ts          # Device info extraction helper
    ├── sanitizeApiCallUrl.ts           # Secret-free, low-cardinality request URL key
    ├── summarizeApiCalls.ts            # Per-scenario request counts from the network log
    └── attributeApiCallsToSteps.ts     # Per-timer-step request counts + clock-skew check
```

## Module Responsibilities

### PerformanceReporter.ts

Main Playwright reporter registered in `playwright.config.ts`. Handles test lifecycle events (`onBegin`, `onTestEnd`, `onEnd`) and orchestrates session enrichment and report generation.

### PerformanceTracker.ts

Manages timers and attaches metrics to test results. Used as a fixture in performance tests. Contains no provider-specific logic.

### providers/SessionDataEnricher.ts

Defines the `ISessionDataEnricher` interface that all providers implement. New providers just need to implement `enrichSession()`, `canHandle()`, and `getProviderName()`.

### providers/testmu/TestMuAIEnricher.ts

TestMu enricher. Fetches video URLs, app metrics, and network logs via `TestMuAIAPI`.

### generators/

Each generator takes a `ReportData` object and produces output in a specific format:

- **HtmlReportGenerator** — Full HTML report with test tables, quality gates, profiling cards
- **CsvReportGenerator** — CSV with per-test step rows and profiling summaries
- **JsonReportGenerator** — Device-specific JSON files + one `reports/app-profiling/app-profiling-*.json` file per scenario (profiling + API calls) + `failed-tests-by-team.json`

### utils/summarizeApiCalls.ts

Turns a scenario's captured network log into `ApiCallsSummary`: `total`, `unique` (method + sanitized URL), `duplicates`, `failed` (status >= 400, missing or 0), `byHost` and `topEndpoints`. A failed capture (`apiCallsError`) yields `{ status: 'error' }` and no capture yields `null`, so neither is mistaken for 0 requests. The summary is written to `apiCallsSummary` in each `app-profiling-*.json` and sent to Sentry by `publishApiCallsSummaryToSentry` as its own transaction (op `e2e.performance.network_summary`, same transaction name as the scenario). Query it in Sentry Explore (spans) with `span.op:e2e.performance.network` and the numeric attributes `api.requests.total`, `api.requests.unique`, `api.requests.duplicates` and `api.requests.failed`; per-host (`e2e.performance.network.host`) and per-endpoint (`e2e.performance.network.endpoint`) spans carry `api.host` / `api.endpoint` breakdowns.

#### Per-step attribution

Each call is assigned to a timer step by its HAR `startedDateTime` against the step's `[startedAt, endedAt]` window (epoch ms, from `TimerHelper.getWindow()`); the rest go to `unattributed`. Precedence is strict, so a call is counted once: `during` (inside the window) > pre-roll (up to 750 ms before the start, because a tap fires requests before `measure()` starts; counted as `during`) > `after` (up to 5 s after the end; a next step's `during` or pre-roll outranks it, so `after` stops when the next step begins). Overlapping or nested timers resolve to the shortest window (then the latest start, then step order). `after` calls are summarized and published separately (`api.step.phase` = `during` | `after`, `none` for `unattributed`) so `during` counts stay clean.

The summary gains `steps[]` and `stepAttribution` (`ok` | `skewed` | `no_overlap` | `unavailable`). Unattributed calls (app launch, login, setup) are normal and never count as skew. `skewed` means at least 30% of calls (with 10 or more) start outside the real test window (`testStartedAt` .. `testEndedAt`, from Playwright's `startTime` and `duration`, +/- 30s for HAR start/teardown), so the clocks probably disagree. `no_overlap` means no call landed in a step and the HAR timespan does not intersect the steps' timespan.

When a test is retried, each attempt leaves a session. The metrics carry the `sessionId` of the attempt that produced them and that session's HAR is used; without it, the session whose HAR overlaps the steps is used, else the latest.

Every endpoint carries `api.kind`: `app`, `preflight` (OPTIONS), `test_infra` (local mock server `localhost` / `10.0.2.2` on port 8000, `health-check` on local hosts) or `telemetry` (`*.ingest.sentry.io`, `clients2.google.com`); only obvious cases are labelled, everything else is `app`. The summary has app-only totals (`app`), and top endpoints list `app` first so noise cannot crowd them out.

Sentry gets `e2e.performance.network.step` (`api.step`, `api.step.phase`, `api.step.requests`, `api.step.requests.app`, `api.step.failed`) and `e2e.performance.network.step_endpoint` (top 10 per step and phase: `api.step`, `api.step.phase`, `api.step_endpoint` = `<step> | <METHOD> <endpoint>` (`<step> (after)` for the after phase), `api.method`, `api.kind`, `api.endpoint`, `api.endpoint.requests`, description `[<step>] <METHOD> <endpoint>`), plus the `api_step_attribution` tag. Recommended filters: `api_step_attribution:ok api.step.phase:during api.kind:app`.

**WebSockets are out of scope.** The TestMu proxy HAR only holds HTTP/HTTPS. Services on WebSockets are invisible here: `gateway.api.cx.metamask.io`, Polymarket WS, Hyperliquid `WebSocketTransport` and the `mm-sdk-relay`. An HTTP-to-WebSocket migration will therefore look like a drop in request counts, not a real saving.

### utils/DeviceInfoExtractor.ts

Static helper that resolves device info from multiple Playwright test object paths with env var fallbacks.

## Adding a New Service Provider

To support a new device cloud, you need to create an enricher and register it.

### 1. Create an API client (if needed)

Add a client under `tests/framework/services/providers/<provider>/` following the `TestMuAIAPI.ts` pattern. All HTTP calls, auth, and retries belong here — enrichers should never make raw requests.

### 2. Create the enricher

```
tests/reporters/providers/<provider>/
└── <Provider>Enricher.ts
```

Extend `BaseSessionDataEnricher` and implement three methods:

```typescript
import { BaseSessionDataEnricher } from '../SessionDataEnricher';
import type { SessionData } from '../../types';

export class MyProviderEnricher extends BaseSessionDataEnricher {
  constructor() {
    super('MyProvider'); // logger name
  }

  getProviderName(): string {
    return 'myprovider';
  }

  canHandle(projectName: string): boolean {
    return projectName.includes('myprovider-');
  }

  async enrichSession(session: SessionData): Promise<void> {
    // Call your API client, transform results, mutate session in-place:
    // session.videoURL, session.profilingData, session.networkLogsEntries, etc.
  }
}
```

### 3. Register in PerformanceReporter.ts

Update `enrichSessionsWithTestMuData()` to iterate over a list of enrichers and use `canHandle()` to match sessions to providers:

```typescript
private getEnrichers(): ISessionDataEnricher[] {
  return [
    new TestMuAIEnricher(),
    new MyProviderEnricher(),
  ];
}

private async enrichSessionsWithProviderData(): Promise<void> {
  const enrichers = this.getEnrichers();
  for (const session of this.sessions) {
    const enricher = enrichers.find((e) => e.canHandle(session.projectName ?? ''));
    if (enricher) await enricher.enrichSession(session);
  }
}
```

Call `enrichSessionsWithProviderData()` for every run and let `canHandle()` decide which sessions each enricher owns.

### 4. Add project config in playwright.config.ts

Add a project whose `name` includes the prefix your enricher's `canHandle()` matches on.

### Files to touch

| File                                                       | Change                                   |
| ---------------------------------------------------------- | ---------------------------------------- |
| `providers/<provider>/<Provider>Enricher.ts`               | **New** — enricher class                 |
| `framework/services/providers/<provider>/<Provider>API.ts` | **New** (if needed) — API client         |
| `PerformanceReporter.ts`                                   | Import enricher, add to `getEnrichers()` |
| `playwright.config.ts`                                     | Add project entry with matching name     |

## Data Flow

```
Test Execution
    │
    ├─ PerformanceTracker.attachToTest() → metrics attachment
    │
    ▼
PerformanceReporter.onTestEnd()
    │
    ├─ processSessionData() → session extraction
    ├─ trackFailedTest() → failure grouping by team
    └─ processMetrics() → quality gates validation
    │
    ▼
PerformanceReporter.onEnd()
    │
    ├─ enrichSessionsWithTestMuData() → TestMuAIEnricher
    └─ generateReports()
        ├─ HtmlReportGenerator.generate()
        ├─ CsvReportGenerator.generate()
        └─ JsonReportGenerator.generate()
```
