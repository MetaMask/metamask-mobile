import { latencyThresholdsFor } from './latencyThresholdsFor';

describe('latencyThresholdsFor', () => {
  it.each([
    ['HIGH', { hungMs: 8000, slowMs: 2500 }],
    ['MID', { hungMs: 15000, slowMs: 5500 }],
    ['LOW', { hungMs: 30000, slowMs: 12500 }],
    [null, { hungMs: 15000, slowMs: 5500 }],
  ] as const)('returns the %s row', (hardwareTier, expected) => {
    const result = latencyThresholdsFor(hardwareTier);

    expect(result).toEqual(expected);
  });
});
