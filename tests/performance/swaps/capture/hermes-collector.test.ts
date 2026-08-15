import {
  buildDrainDiagnosticsExpression,
  buildInstallDiagnosticsExpression,
  buildMarkerExpression,
  extractCdpEvaluationValue,
  parseRuntimeCapture,
} from './hermes-collector';

describe('Swaps performance Hermes collector', () => {
  it('builds a sanitized bounded collector', () => {
    const expression = buildInstallDiagnosticsExpression();

    expect(expression).toContain('__SWAPS_PERF_ANALYSIS__');
    expect(expression).toContain("return ':id'");
    expect(expression).toContain('capture.network.length>1000');
    expect(expression).not.toContain('headers:');
  });

  it('builds marker and drain expressions for the shared buffer', () => {
    const marker = buildMarkerExpression('open-swaps:start');
    const drain = buildDrainDiagnosticsExpression();

    expect(marker).toContain('open-swaps:start');
    expect(drain).toContain('capture.enabled=false');
  });

  it('extracts a nested Hermes evaluation value', () => {
    const output = {
      method: 'Runtime.evaluate',
      result: { result: { result: { type: 'string', value: '{"ok":true}' } } },
    };

    const result = extractCdpEvaluationValue(output);

    expect(result).toBe('{"ok":true}');
  });

  it('parses a complete runtime capture', () => {
    const capture = {
      enabled: false,
      startedAt: 100,
      markers: [{ name: 'scenario:start', timestamp: 100 }],
      renders: { BridgeView: { count: 1, timestamps: [110] } },
      network: [
        {
          timestamp: 120,
          method: 'GET',
          host: 'example.test',
          path: '/quote',
        },
      ],
      console: [{ timestamp: 130, level: 'warn', message: 'warning' }],
    };

    const result = parseRuntimeCapture(capture);

    expect(result).toEqual(capture);
  });

  it('rejects a runtime capture without required buffers', () => {
    const value = { enabled: true, startedAt: 100 };

    const result = parseRuntimeCapture(value);

    expect(result).toBeNull();
  });
});
