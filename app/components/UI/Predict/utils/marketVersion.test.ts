import {
  getPredictClaimOutcomeVersion,
  getPredictOutcomeVersion,
} from './marketVersion';

describe('getPredictOutcomeVersion', () => {
  it.each([
    ['v2', 'v2'],
    ['v1', 'v1'],
    [undefined, 'v1'],
    ['v3', 'v1'],
  ])('maps outcome version %s to %s', (version, expected) => {
    expect(getPredictOutcomeVersion({ version })).toBe(expected);
  });

  it('returns undefined when there is no outcome', () => {
    expect(getPredictOutcomeVersion(undefined)).toBeUndefined();
  });
});

describe('getPredictClaimOutcomeVersion', () => {
  const v1Position = { outcomeId: 'v1-outcome' };
  const v2Position = { outcomeId: 'v2-outcome' };
  const marketVersions = {
    [v1Position.outcomeId]: undefined,
    [v2Position.outcomeId]: 'v2',
  };

  it.each([
    ['only v1 positions', [v1Position], 'v1'],
    ['only v2 positions', [v2Position], 'v2'],
    ['v1 and v2 positions', [v1Position, v2Position], 'mixed'],
  ])('returns %s as %s', (_label, positions, expected) => {
    expect(getPredictClaimOutcomeVersion(positions, marketVersions)).toBe(
      expected,
    );
  });

  it('treats a position without a version entry as v1', () => {
    expect(
      getPredictClaimOutcomeVersion([{ outcomeId: 'unknown-outcome' }], {}),
    ).toBe('v1');
  });

  it('returns undefined when the versions are not known', () => {
    expect(
      getPredictClaimOutcomeVersion([v1Position], undefined),
    ).toBeUndefined();
  });

  it.each([
    ['empty', []],
    ['undefined', undefined],
  ])('returns undefined when the positions are %s', (_label, positions) => {
    expect(
      getPredictClaimOutcomeVersion(positions, marketVersions),
    ).toBeUndefined();
  });
});
