import { RuntimeNetworkEntry } from '../capture/hermes-collector';
import { SwapsPerformanceArtifact } from './artifact';
import { compareSwapsPerformanceArtifacts } from './comparison';
import { formatComparisonMarkdown } from './comparison-report';

function createArtifact(
  id: string,
  createdAt: string,
  durationMs: number,
  network: RuntimeNetworkEntry[],
): SwapsPerformanceArtifact {
  return {
    schemaVersion: 1,
    run: {
      id,
      scenario: 'open-swaps-fetch-one-eth-quote',
      scenarioId: 'SWAPS-PERF-001',
      scenarioName: 'Open Swaps and fetch a 1 ETH quote',
      scenarioDescription: 'Measures the 1 ETH quote flow.',
      createdAt,
      commit: 'abc1234',
      platform: 'ios-simulator',
      metroPort: 8081,
      status: 'passed',
    },
    preconditions: { walletUnlocked: true, sourceTokenText: 'ETH' },
    phases: [
      {
        name: 'fetch-first-quote',
        startedAt: 100,
        endedAt: 100 + durationMs,
        durationMs,
      },
    ],
    capture: {
      enabled: false,
      startedAt: 0,
      markers: [],
      renders: { BridgeView: { count: durationMs / 100, timestamps: [] } },
      network,
      console: [],
    },
    summary: {
      networkRequests: network.length,
      failedNetworkRequests: 0,
      consoleErrors: 0,
      renders: { BridgeView: durationMs / 100 },
      networkRequestsByPhase: { 'fetch-first-quote': network.length },
      slowestNetworkRequests: [],
    },
    failure: null,
  };
}

describe('Swaps performance comparison report', () => {
  it('renders ranges, request frequency and duration, and source runs', () => {
    const request = {
      timestamp: 100,
      method: 'POST',
      host: 'quotes.test',
      path: '/quote',
      durationMs: 20,
    };
    const comparison = compareSwapsPerformanceArtifacts([
      createArtifact('first', '2026-08-11T00:00:00.000Z', 1_000, [request]),
      createArtifact('second', '2026-08-11T00:01:00.000Z', 1_200, [
        request,
        { ...request, timestamp: 200, durationMs: 40 },
      ]),
    ]);

    const report = formatComparisonMarkdown(comparison);

    expect(report).toContain('# SWAPS-PERF-001 — Within-commit comparison');
    expect(report).toContain(
      '| fetch-first-quote | 1000 ms | 1100 ms | 1200 ms | 200 ms |',
    );
    expect(report).toContain(
      '| POST quotes.test/quote | — | 2/2 | 3 | 1 | 1.5 | 2 | 1 | 3 | 20 ms | 20 ms | 40 ms |',
    );
    expect(report).toContain('## Individual runs');
    expect(report).toContain('`first`');
    expect(report).toContain('`second`');
    expect(report).toContain('within-commit development-build variability');
    expect(report).toContain('clean working tree');
  });
});
