import {
  SwapsPerformanceArtifact,
  parseSwapsPerformanceArtifact,
} from './artifact';

function createArtifact(): SwapsPerformanceArtifact {
  return {
    schemaVersion: 1,
    run: {
      id: 'swaps-perf-001-run',
      scenario: 'open-swaps-fetch-one-eth-quote',
      scenarioId: 'SWAPS-PERF-001',
      scenarioName: 'Open Swaps and fetch a 1 ETH quote',
      scenarioDescription:
        'Measures the work performed while opening Swaps, selecting Ethereum USDC, entering 1 ETH, and waiting for the first positive quote.',
      createdAt: '2026-08-11T00:00:00.000Z',
      commit: 'abc1234',
      platform: 'ios-simulator',
      metroPort: 8081,
      status: 'passed',
    },
    preconditions: {
      walletUnlocked: true,
      sourceTokenText: 'ETH',
      destinationToken: 'USDC',
      sourceAmount: '1',
    },
    phases: [],
    capture: null,
    summary: null,
    failure: null,
  };
}

describe('Swaps performance artifact', () => {
  it('parses the current artifact schema', () => {
    const artifact = createArtifact();

    const parsed = parseSwapsPerformanceArtifact(artifact);

    expect(parsed).toEqual(artifact);
  });

  it.each(['scenarioId', 'scenarioName', 'scenarioDescription'] as const)(
    'rejects an artifact without %s',
    (field) => {
      const artifact = createArtifact();
      const run = { ...artifact.run };
      delete run[field];

      const parsed = parseSwapsPerformanceArtifact({ ...artifact, run });

      expect(parsed).toBeNull();
    },
  );

  it('rejects an unknown scenario slug', () => {
    const artifact = createArtifact();
    artifact.run.scenario = 'unknown-scenario';

    const parsed = parseSwapsPerformanceArtifact(artifact);

    expect(parsed).toBeNull();
  });
});
