import {
  extractCdpEvaluationValue,
  extractInteractionText,
  findScenarioFindings,
  formatArtifactMarkdown,
  hasPositiveNumericValue,
  parseRuntimeCapture,
  parseSwapsPerformanceArtifact,
  RuntimeCapture,
  ScenarioPhase,
  ScenarioSummary,
  summarizeCapture,
  SwapsPerformanceArtifact,
} from './diagnostics';

function createArtifact(
  summaryOverrides: Partial<ScenarioSummary> = {},
): SwapsPerformanceArtifact {
  return {
    schemaVersion: 1,
    run: {
      id: 'run-id',
      scenario: 'open-swaps-fetch-one-eth-quote',
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
    capture: {
      enabled: false,
      startedAt: 100,
      markers: [],
      renders: { BridgeView: { count: 2, timestamps: [110, 120] } },
      network: [],
      console: [],
    },
    summary: {
      networkRequests: 0,
      failedNetworkRequests: 0,
      consoleErrors: 0,
      renders: { BridgeView: 2 },
      networkRequestsByPhase: {},
      slowestNetworkRequests: [],
      ...summaryOverrides,
    },
    failure: null,
  };
}

describe('Swaps performance diagnostics', () => {
  it('extracts a nested Hermes evaluation value', () => {
    const output = {
      method: 'Runtime.evaluate',
      result: { result: { result: { type: 'string', value: '{"ok":true}' } } },
    };

    const result = extractCdpEvaluationValue(output);

    expect(result).toBe('{"ok":true}');
  });

  it('extracts text from an mm interaction response', () => {
    const output = { result: { text: '1.25 USDC' } };

    const result = extractInteractionText(output);

    expect(result).toBe('1.25 USDC');
  });

  it('extracts text for the requested test ID from a screen observation', () => {
    const output = {
      observation: {
        testIds: [
          { testId: 'source-token-area-input', text: '0' },
          { testId: 'source-token-selector-button', text: 'ETH' },
        ],
      },
    };

    const result = extractInteractionText(
      output,
      'source-token-selector-button',
    );

    expect(result).toBe('ETH');
  });

  it('rejects a runtime capture without required buffers', () => {
    const value = { enabled: true, startedAt: 100 };

    const result = parseRuntimeCapture(value);

    expect(result).toBeNull();
  });

  it.each([
    ['1.25 USDC', true],
    ['0 USDC', false],
    ['Select amount', false],
    [null, false],
  ])('detects a positive quote in %s', (text, expected) => {
    const result = hasPositiveNumericValue(text);

    expect(result).toBe(expected);
  });

  it('summarizes renders and phase-scoped network requests', () => {
    const phases: ScenarioPhase[] = [
      {
        name: 'open-swaps',
        startedAt: 100,
        endedAt: 200,
        durationMs: 100,
      },
      {
        name: 'select-destination',
        startedAt: 201,
        endedAt: 300,
        durationMs: 99,
      },
      {
        name: 'fetch-first-quote',
        startedAt: 301,
        endedAt: 500,
        durationMs: 199,
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
          status: 200,
          durationMs: 120,
        },
      ],
      console: [],
    };

    const result = summarizeCapture(capture, phases);

    expect(result.renders).toEqual({ BridgeView: 3 });
    expect(result.networkRequestsByPhase).toEqual({
      'open-swaps': 1,
      'select-destination': 0,
      'fetch-first-quote': 1,
    });
  });

  it('parses a serialized performance artifact', () => {
    const artifact = createArtifact();

    const serializedArtifact = JSON.stringify(artifact);
    const parsedJson: unknown = JSON.parse(serializedArtifact);
    const parsedArtifact = parseSwapsPerformanceArtifact(parsedJson);

    expect(parsedArtifact).toEqual(artifact);
  });

  it('flags failed network requests', () => {
    const artifact = createArtifact({ failedNetworkRequests: 1 });

    const findings = findScenarioFindings(artifact);

    expect(findings).toContainEqual({
      severity: 'high',
      message: '1 network request(s) failed.',
    });
  });

  it('flags network requests above five seconds', () => {
    const artifact = createArtifact({
      slowestNetworkRequests: [
        {
          timestamp: 120,
          method: 'GET',
          host: 'example.test',
          path: '/quote',
          status: 200,
          durationMs: 6_000,
        },
      ],
    });

    const findings = findScenarioFindings(artifact);

    expect(findings).toContainEqual({
      severity: 'medium',
      message: '1 network request(s) took longer than 5000 ms.',
    });
  });

  it('labels findings as single-run observations', () => {
    const artifact = createArtifact();

    const findings = findScenarioFindings(artifact);

    expect(findings).toContainEqual(
      expect.objectContaining({
        severity: 'info',
        message: expect.stringContaining('one development-build run'),
      }),
    );
  });

  it('reports network call counts grouped by sanitized request identity', () => {
    const artifact = createArtifact();
    if (!artifact.capture) {
      throw new Error('Expected runtime capture');
    }
    artifact.capture.network = [
      {
        timestamp: 100,
        method: 'GET',
        host: 'example.test',
        path: '/tokens',
        status: 200,
        durationMs: 20,
      },
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
        method: 'POST',
        host: 'rpc.example.test',
        path: '/',
        rpcMethod: 'eth_call',
        status: 200,
        durationMs: 40,
      },
    ];

    const report = formatArtifactMarkdown(artifact);

    expect(report).toContain('## Network request counts');
    expect(report).toContain('| GET example.test/tokens | — | 2 |');
    expect(report).toContain('| POST rpc.example.test/ | eth_call | 1 |');
  });
});
