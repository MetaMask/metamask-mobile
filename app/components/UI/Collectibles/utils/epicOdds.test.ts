import type { EpicHuntMachine } from '#app/components/UI/Collectibles/types/packs';
import {
  getAveragePullsPerEpic,
  getPullsOverAverage,
  rankEpicOddsPacks,
} from '#app/components/UI/Collectibles/utils/epicOdds';

function machine(overrides: Partial<EpicHuntMachine> = {}): EpicHuntMachine {
  return {
    code: 'pack-1',
    name: 'Lorem ipsum',
    openedCount: 0,
    priceUsd: 25,
    isMachineOpen: true,
    isApproved: true,
    epicOdds: 0.01,
    pullsSinceEpic: 32,
    ...overrides,
  };
}

function rankedCodes(machines: EpicHuntMachine[]) {
  return rankEpicOddsPacks(machines).map((pack) => pack.code);
}

describe('getAveragePullsPerEpic', () => {
  it.each([
    [0.01, 100],
    [0.0275, 37],
    [0.015, 67],
    [0.1, 10],
  ])('rounds 1 / %d up to %d', (epicOdds, average) => {
    expect(getAveragePullsPerEpic(epicOdds)).toBe(average);
  });
});

describe('getPullsOverAverage', () => {
  it.each([
    [32, -68],
    [100, 0],
    [112, 12],
  ])('shows %d pulls on a 100 average as %d', (pullsSinceEpic, value) => {
    const [pack] = rankEpicOddsPacks([machine({ pullsSinceEpic })]);

    expect(getPullsOverAverage(pack)).toBe(value);
  });
});

describe('rankEpicOddsPacks', () => {
  it('puts the highest ratio first', () => {
    expect(
      rankedCodes([
        machine({ code: 'low', pullsSinceEpic: 10 }),
        machine({ code: 'high', epicOdds: 0.02, pullsSinceEpic: 75 }),
      ]),
    ).toEqual(['high', 'low']);
  });

  it('puts the cheaper pack first on equal ratios', () => {
    expect(
      rankedCodes([
        machine({ code: 'pricey', priceUsd: 50 }),
        machine({ code: 'cheap', priceUsd: 10 }),
      ]),
    ).toEqual(['cheap', 'pricey']);
  });

  it.each([
    ['closed', { isMachineOpen: false }],
    ['not approved', { isApproved: false }],
    ['without Epic odds', { epicOdds: undefined }],
    ['with zero Epic odds', { epicOdds: 0 }],
    ['with negative Epic odds', { epicOdds: -0.01 }],
    ['with NaN Epic odds', { epicOdds: NaN }],
    ['with infinite Epic odds', { epicOdds: Infinity }],
    ['with Epic odds above 100%', { epicOdds: 1.5 }],
    ['with negative pulls since last Epic', { pullsSinceEpic: -1 }],
    ['with NaN pulls since last Epic', { pullsSinceEpic: NaN }],
    ['without a price', { priceUsd: undefined }],
  ])('drops a pack that is %s', (_label, overrides) => {
    expect(
      rankedCodes([
        machine({ code: 'kept' }),
        machine({ code: 'gone', ...overrides }),
      ]),
    ).toEqual(['kept']);
  });

  it('keeps at most 10 packs', () => {
    const machines = Array.from({ length: 12 }, (_, index) =>
      machine({ code: `pack-${index}` }),
    );

    expect(rankEpicOddsPacks(machines)).toHaveLength(10);
  });
});
