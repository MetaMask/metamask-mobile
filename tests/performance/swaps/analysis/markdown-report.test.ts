import { SwapsPerformanceArtifact } from './artifact';
import { formatArtifactMarkdown } from './markdown-report';

function createArtifact(): SwapsPerformanceArtifact {
  return {
    schemaVersion: 1,
    run: {
      id: 'swaps-perf-001-run',
      scenario: 'open-swaps-fetch-one-eth-quote',
      scenarioId: 'SWAPS-PERF-001',
      scenarioName: 'Open Swaps and fetch a 1 ETH quote',
      scenarioDescription: 'Measures the 1 ETH quote flow.',
      createdAt: '2026-08-11T00:00:00.000Z',
      commit: 'abc1234',
      platform: 'ios-simulator',
      metroPort: 8081,
      status: 'passed',
    },
    preconditions: { walletUnlocked: true },
    phases: [],
    capture: {
      enabled: false,
      startedAt: 100,
      markers: [],
      renders: { BridgeView: { count: 2, timestamps: [110, 120] } },
      network: [
        {
          timestamp: 120,
          method: 'GET',
          host: 'example.test',
          path: '/tokens',
          status: 200,
          durationMs: 30,
        },
        {
          timestamp: 140,
          method: 'GET',
          host: 'example.test',
          path: '/tokens',
          status: 200,
          durationMs: 20,
        },
      ],
      console: [],
    },
    summary: {
      networkRequests: 2,
      failedNetworkRequests: 0,
      consoleErrors: 0,
      renders: { BridgeView: 2 },
      networkRequestsByPhase: {},
      slowestNetworkRequests: [],
    },
    failure: null,
  };
}

describe('Swaps performance Markdown report', () => {
  it('renders scenario identity and description', () => {
    const report = formatArtifactMarkdown(createArtifact());

    expect(report).toContain(
      '# SWAPS-PERF-001 — Open Swaps and fetch a 1 ETH quote',
    );
    expect(report).toContain('Measures the 1 ETH quote flow.');
  });

  it('renders request frequency separately from request duration', () => {
    const report = formatArtifactMarkdown(createArtifact());

    expect(report).toContain('## Network request counts');
    expect(report).toContain('| GET example.test/tokens | — | 2 |');
    expect(report).toContain('## Findings');
  });
});
