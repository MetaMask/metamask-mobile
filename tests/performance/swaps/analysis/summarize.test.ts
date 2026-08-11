import { RuntimeCapture } from '../capture/hermes-collector';
import { ScenarioPhase } from '../scenarios/types';
import { SwapsPerformanceArtifact } from './artifact';
import {
  findScenarioFindings,
  summarizeCapture,
  summarizeNetworkRequestCounts,
} from './summarize';

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
      renders: { BridgeView: { count: 1, timestamps: [110] } },
      network: [],
      console: [],
    },
    summary: {
      networkRequests: 0,
      failedNetworkRequests: 0,
      consoleErrors: 0,
      renders: { BridgeView: 1 },
      networkRequestsByPhase: {},
      slowestNetworkRequests: [],
    },
    failure: null,
  };
}

describe('Swaps performance summary', () => {
  it('summarizes renders and phase-scoped network requests', () => {
    const phases: ScenarioPhase[] = [
      { name: 'open-swaps', startedAt: 100, endedAt: 200, durationMs: 100 },
      {
        name: 'fetch-first-quote',
        startedAt: 201,
        endedAt: 500,
        durationMs: 299,
      },
    ];
    const capture: RuntimeCapture = {
      enabled: false,
      startedAt: 90,
      markers: [],
      renders: { BridgeView: { count: 3, timestamps: [120, 250, 450] } },
      network: [
        {
          timestamp: 150,
          method: 'GET',
          host: 'example.test',
          path: '/open',
          status: 200,
          durationMs: 20,
        },
        {
          timestamp: 350,
          method: 'GET',
          host: 'example.test',
          path: '/quote',
          status: 500,
          durationMs: 120,
        },
      ],
      console: [{ timestamp: 400, level: 'error', message: 'failed' }],
    };

    const result = summarizeCapture(capture, phases);

    expect(result.renders).toEqual({ BridgeView: 3 });
    expect(result.networkRequestsByPhase).toEqual({
      'open-swaps': 1,
      'fetch-first-quote': 1,
    });
    expect(result.failedNetworkRequests).toBe(1);
    expect(result.consoleErrors).toBe(1);
  });

  it('groups request counts by sanitized request identity', () => {
    const entries = [
      {
        timestamp: 100,
        method: 'GET',
        host: 'example.test',
        path: '/tokens',
      },
      {
        timestamp: 120,
        method: 'GET',
        host: 'example.test',
        path: '/tokens',
      },
      {
        timestamp: 140,
        method: 'POST',
        host: 'rpc.example.test',
        path: '/',
        rpcMethod: 'eth_call',
      },
    ];

    const result = summarizeNetworkRequestCounts(entries);

    expect(result).toEqual([
      {
        method: 'GET',
        host: 'example.test',
        path: '/tokens',
        rpcMethod: undefined,
        count: 2,
      },
      {
        method: 'POST',
        host: 'rpc.example.test',
        path: '/',
        rpcMethod: 'eth_call',
        count: 1,
      },
    ]);
  });

  it('flags failed and slow network requests', () => {
    const artifact = createArtifact();
    if (!artifact.summary) {
      throw new Error('Expected a scenario summary');
    }
    artifact.summary.failedNetworkRequests = 1;
    artifact.summary.slowestNetworkRequests = [
      {
        timestamp: 120,
        method: 'GET',
        host: 'example.test',
        path: '/quote',
        status: 500,
        durationMs: 6_000,
      },
    ];

    const findings = findScenarioFindings(artifact);

    expect(findings).toContainEqual({
      severity: 'high',
      message: '1 network request(s) failed.',
    });
    expect(findings).toContainEqual({
      severity: 'medium',
      message: '1 network request(s) took longer than 5000 ms.',
    });
  });

  it('labels findings as single-run observations', () => {
    const findings = findScenarioFindings(createArtifact());

    expect(findings).toContainEqual(
      expect.objectContaining({
        severity: 'info',
        message: expect.stringContaining('one development-build run'),
      }),
    );
  });
});
