# Performance Reporters

Architecture for the performance test reporting system.

## File Structure

```
tests/reporters/
├── PerformanceReporter.ts              # Main Playwright reporter (entry point)
├── PerformanceTracker.ts               # Timer management + metrics attachment
├── DetoxPerformanceTestReporter.ts     # Detox reporter (independent, untouched)
├── types.ts                            # Shared TypeScript types
├── providers/
│   ├── SessionDataEnricher.ts          # Interface for provider-agnostic enrichment
│   └── browserstack/
│       └── BrowserStackEnricher.ts     # BrowserStack: video URLs, profiling, network logs
├── generators/
│   ├── HtmlReportGenerator.ts          # HTML report generation
│   ├── CsvReportGenerator.ts           # CSV report generation
│   └── JsonReportGenerator.ts          # JSON device reports + failed-tests-by-team
└── utils/
    └── DeviceInfoExtractor.ts          # Device info extraction helper
```

## Module Responsibilities

### PerformanceReporter.ts

Main Playwright reporter registered in `appwright.config.ts`. Handles test lifecycle events (`onBegin`, `onTestEnd`, `onEnd`) and orchestrates session enrichment and report generation.

### PerformanceTracker.ts

Manages timers and attaches metrics to test results. Used as a fixture in performance tests. Contains no provider-specific logic.

### providers/SessionDataEnricher.ts

Defines the `ISessionDataEnricher` interface that all providers implement. New providers just need to implement `enrichSession()`, `canHandle()`, and `getProviderName()`.

### providers/browserstack/BrowserStackEnricher.ts

BrowserStack-specific enricher. Fetches video URLs (with retry), profiling data, and network logs (HAR) via `BrowserStackAPI`.

### generators/

Each generator takes a `ReportData` object and produces output in a specific format:

- **HtmlReportGenerator** — Full HTML report with test tables, quality gates, profiling cards
- **CsvReportGenerator** — CSV with per-test step rows and profiling summaries
- **JsonReportGenerator** — Device-specific JSON files + `failed-tests-by-team.json`

### utils/DeviceInfoExtractor.ts

Static helper that resolves device info from multiple Playwright test object paths with env var fallbacks.

## Adding a New Service Provider

To support a new device cloud, you need to create an enricher and register it.

### 1. Create an API client (if needed)

Add a client under `tests/framework/services/providers/<provider>/` following the `BrowserStackAPI.ts` pattern. All HTTP calls, auth, and retries belong here — enrichers should never make raw requests.

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

Update `enrichSessionsWithProviderData()` to iterate over a list of enrichers and use `canHandle()` to match sessions to providers:

```typescript
private getEnrichers(): ISessionDataEnricher[] {
  return [
    new BrowserStackEnricher(),
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

Replace `detectBrowserStackRun()` with a generic check, or always call `enrichSessionsWithProviderData()` and let the registry decide.

### 4. Add project config in appwright.config.ts

Add a project whose `name` includes the prefix your enricher's `canHandle()` matches on.

### Files to touch

| File                                                       | Change                                   |
| ---------------------------------------------------------- | ---------------------------------------- |
| `providers/<provider>/<Provider>Enricher.ts`               | **New** — enricher class                 |
| `framework/services/providers/<provider>/<Provider>API.ts` | **New** (if needed) — API client         |
| `PerformanceReporter.ts`                                   | Import enricher, add to `getEnrichers()` |
| `appwright.config.ts`                                      | Add project entry with matching name     |

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
    ├─ enrichSessionsWithProviderData() → BrowserStackEnricher
    └─ generateReports()
        ├─ HtmlReportGenerator.generate()
        ├─ CsvReportGenerator.generate()
        └─ JsonReportGenerator.generate()
```
