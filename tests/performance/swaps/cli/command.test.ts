import { parseSwapsPerformanceCommand } from './command';

describe('Swaps performance command', () => {
  it('parses a scenario reference without hard-coding its number', () => {
    const command = parseSwapsPerformanceCommand([
      'run',
      '--scenario',
      'SWAPS-PERF-001',
      '--metro-port',
      '8081',
    ]);

    expect(command).toEqual({
      action: 'run',
      scenario: 'SWAPS-PERF-001',
      args: ['--metro-port', '8081'],
    });
  });

  it.each(['prepare', 'status', 'cleanup'] as const)(
    'parses the %s lifecycle action',
    (action) => {
      const command = parseSwapsPerformanceCommand([action]);

      expect(command).toEqual({ action });
    },
  );

  it('passes analyzer arguments through unchanged', () => {
    const command = parseSwapsPerformanceCommand(['analyze', '--latest']);

    expect(command).toEqual({
      action: 'analyze',
      args: ['--latest'],
    });
  });

  it('rejects a run without a scenario option', () => {
    expect(() => parseSwapsPerformanceCommand(['run'])).toThrow(
      'Run requires exactly one --scenario option',
    );
  });

  it('rejects a scenario option without a value', () => {
    expect(() =>
      parseSwapsPerformanceCommand(['run', '--scenario', '--metro-port']),
    ).toThrow('--scenario requires a value');
  });

  it('rejects an unknown action', () => {
    expect(() => parseSwapsPerformanceCommand(['unknown'])).toThrow('Usage:');
  });
});
