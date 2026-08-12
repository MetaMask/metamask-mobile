import { RuntimeNetworkEntry } from '../capture/hermes-collector';
import { SwapsPerformanceArtifact } from './artifact';
import {
  calculateRangeStatistics,
  compareSwapsPerformanceArtifacts,
} from './comparison';

interface ArtifactOptions {
  id: string;
  createdAt: string;
  status?: 'passed' | 'failed';
  commit?: string;
  preconditions?: SwapsPerformanceArtifact['preconditions'];
  phaseDurations?: number[];
  renders?: Record<string, number>;
  network?: RuntimeNetworkEntry[];
  failedNetworkRequests?: number;
  consoleErrors?: number;
  failure?: string | null;
}

function createArtifact(options: ArtifactOptions): SwapsPerformanceArtifact {
  const status = options.status ?? 'passed';
  const phaseNames = ['open-swaps', 'fetch-first-quote'];
  const phases = (options.phaseDurations ?? [100, 200]).map(
    (durationMs, index) => ({
      name: phaseNames[index],
      startedAt: index * 1_000,
      endedAt: index * 1_000 + durationMs,
      durationMs,
    }),
  );
  const network = options.network ?? [];
  const renders = options.renders ?? { BridgeView: 2 };

  return {
    schemaVersion: 1,
    run: {
      id: options.id,
      scenario: 'open-swaps-fetch-one-eth-quote',
      scenarioId: 'SWAPS-PERF-001',
      scenarioName: 'Open Swaps and fetch a 1 ETH quote',
      scenarioDescription: 'Measures the 1 ETH quote flow.',
      createdAt: options.createdAt,
      commit: options.commit ?? 'abc1234',
      platform: 'ios-simulator',
      metroPort: 8081,
      status,
    },
    preconditions: options.preconditions ?? {
      walletUnlocked: true,
      sourceTokenText: 'ETH',
    },
    phases: status === 'passed' ? phases : [],
    capture:
      status === 'passed'
        ? {
            enabled: false,
            startedAt: 0,
            markers: [],
            renders: Object.fromEntries(
              Object.entries(renders).map(([name, count]) => [
                name,
                { count, timestamps: [] },
              ]),
            ),
            network,
            console: [],
          }
        : null,
    summary:
      status === 'passed'
        ? {
            networkRequests: network.length,
            failedNetworkRequests: options.failedNetworkRequests ?? 0,
            consoleErrors: options.consoleErrors ?? 0,
            renders,
            networkRequestsByPhase: {
              'open-swaps': 1,
              'fetch-first-quote': network.length,
            },
            slowestNetworkRequests: [],
          }
        : null,
    failure:
      options.failure ??
      (status === 'failed' ? 'Scenario did not finish' : null),
  };
}

describe('Swaps performance comparison', () => {
  it('calculates min, median, max, and absolute range', () => {
    expect(calculateRangeStatistics([8, 2, 4, 6])).toEqual({
      samples: 4,
      min: 2,
      median: 5,
      max: 8,
      range: 6,
    });
  });

  it('sorts runs, excludes failures from ranges, and groups network calls', () => {
    const sharedRequest = {
      timestamp: 100,
      method: 'POST',
      host: 'quotes.test',
      path: '/quote',
      rpcMethod: 'eth_call',
    };
    const first = createArtifact({
      id: 'first',
      createdAt: '2026-08-11T00:00:00.000Z',
      phaseDurations: [100, 200],
      renders: { BridgeView: 2 },
      network: [
        { ...sharedRequest, durationMs: 10 },
        {
          timestamp: 150,
          method: 'GET',
          host: 'tokens.test',
          path: '/tokens',
          durationMs: 50,
        },
      ],
    });
    const failed = createArtifact({
      id: 'failed',
      createdAt: '2026-08-11T00:01:00.000Z',
      status: 'failed',
      failure: 'Quote timed out',
    });
    const second = createArtifact({
      id: 'second',
      createdAt: '2026-08-11T00:02:00.000Z',
      phaseDurations: [200, 400],
      renders: { BridgeView: 4 },
      network: [
        { ...sharedRequest, durationMs: 20 },
        { ...sharedRequest, timestamp: 200, durationMs: 40 },
      ],
      failedNetworkRequests: 1,
    });

    const comparison = compareSwapsPerformanceArtifacts([
      second,
      failed,
      first,
    ]);

    expect(comparison.runs.map((artifact) => artifact.run.id)).toEqual([
      'first',
      'failed',
      'second',
    ]);
    expect(comparison.successfulRuns).toHaveLength(2);
    expect(comparison.failedRuns).toHaveLength(1);
    expect(comparison.phaseDurations[0].statistics).toMatchObject({
      min: 100,
      median: 150,
      max: 200,
      range: 100,
    });
    expect(comparison.totalPhaseDuration).toMatchObject({
      min: 300,
      median: 450,
      max: 600,
      range: 300,
    });
    expect(comparison.renders[0]).toMatchObject({
      name: 'BridgeView',
      runsObserved: 2,
      statistics: { min: 2, median: 3, max: 4, range: 2 },
    });
    expect(comparison.requestGroups[0]).toMatchObject({
      method: 'POST',
      host: 'quotes.test',
      path: '/quote',
      rpcMethod: 'eth_call',
      runsObserved: 2,
      totalCalls: 3,
      callsPerRun: { min: 1, median: 1.5, max: 2, range: 1 },
      durationMs: { samples: 3, min: 10, median: 20, max: 40 },
    });
    expect(comparison.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('failed') }),
        expect.objectContaining({
          message: expect.stringContaining('only some successful runs'),
        }),
      ]),
    );
  });

  it('flags render probes missing from a successful run', () => {
    const first = createArtifact({
      id: 'first',
      createdAt: '2026-08-11T00:00:00.000Z',
      renders: { BridgeView: 2, QuoteDetailsCard: 1 },
    });
    const second = createArtifact({
      id: 'second',
      createdAt: '2026-08-11T00:01:00.000Z',
      renders: { BridgeView: 3 },
    });

    const comparison = compareSwapsPerformanceArtifacts([first, second]);

    expect(comparison.renders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'QuoteDetailsCard',
          runsObserved: 1,
        }),
      ]),
    );
    expect(comparison.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'high',
          message: expect.stringContaining('captured in 1 of 2'),
        }),
      ]),
    );
  });

  it('rejects successful runs from different commits', () => {
    const first = createArtifact({
      id: 'first',
      createdAt: '2026-08-11T00:00:00.000Z',
    });
    const second = createArtifact({
      id: 'second',
      createdAt: '2026-08-11T00:01:00.000Z',
      commit: 'def5678',
    });

    expect(() => compareSwapsPerformanceArtifacts([first, second])).toThrow(
      'different commit',
    );
  });

  it.each([
    [
      'preconditions',
      createArtifact({
        id: 'second',
        createdAt: '2026-08-11T00:01:00.000Z',
        preconditions: { walletUnlocked: true, sourceTokenText: 'WETH' },
      }),
    ],
    [
      'ordered phase names',
      {
        ...createArtifact({
          id: 'second',
          createdAt: '2026-08-11T00:01:00.000Z',
        }),
        phases: [
          {
            name: 'different-phase',
            startedAt: 0,
            endedAt: 100,
            durationMs: 100,
          },
          {
            name: 'fetch-first-quote',
            startedAt: 1_000,
            endedAt: 1_200,
            durationMs: 200,
          },
        ],
      },
    ],
  ])('rejects different successful run %s', (expected, second) => {
    const first = createArtifact({
      id: 'first',
      createdAt: '2026-08-11T00:00:00.000Z',
    });

    expect(() => compareSwapsPerformanceArtifacts([first, second])).toThrow(
      expected,
    );
  });

  it('requires at least two successful runs', () => {
    const passed = createArtifact({
      id: 'passed',
      createdAt: '2026-08-11T00:00:00.000Z',
    });
    const failed = createArtifact({
      id: 'failed',
      createdAt: '2026-08-11T00:01:00.000Z',
      status: 'failed',
    });

    expect(() => compareSwapsPerformanceArtifacts([passed, failed])).toThrow(
      'At least two successful runs are required; found 1',
    );
  });
});
