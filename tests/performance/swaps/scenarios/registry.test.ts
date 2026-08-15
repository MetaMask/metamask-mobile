import { resolveScenario } from './registry';

describe('Swaps performance scenario registry', () => {
  it.each(['001', 'SWAPS-PERF-001', 'swaps-perf-001'])(
    'resolves Scenario 001 from %s',
    (reference) => {
      const scenario = resolveScenario(reference);

      expect(scenario.metadata.id).toBe('SWAPS-PERF-001');
    },
  );

  it('rejects an unknown scenario reference', () => {
    expect(() => resolveScenario('999')).toThrow(
      'Unknown Swaps performance scenario: 999',
    );
  });
});
