import type { PpMachine, PpStatus } from '../schemas/packPartner';
import { toPacks } from './packs';

const createMachine = (overrides: Partial<PpMachine> = {}): PpMachine => ({
  code: 'pokemon_50',
  name: 'Elite Pokémon Collectibles Pack',
  shortName: 'PKMN 50',
  public: true,
  menuOrder: 4,
  menuCategory: 'Pokemon',
  price: 50,
  instantBuyback: 85,
  odds: { common: 0.8, uncommon: 0.15, rare: 0.04, epic: 0.01 },
  tierRanges: {
    common: { start: 30, end: 60 },
    uncommon: { start: 60, end: 110 },
    rare: { start: 110, end: 250 },
    epic: { start: 250, end: 5001 },
  },
  ...overrides,
});

const createStatus = (
  codes: string[],
  overrides: Partial<PpStatus> = {},
): PpStatus => ({
  machineStatus: 'running',
  gachas: codes.map((code) => ({ code, status: 'open' })),
  ...overrides,
});

describe('toPacks', () => {
  it('maps a public open machine to a pack', () => {
    const machines = [createMachine()];

    const packs = toPacks(machines, createStatus(['pokemon_50']));

    expect(packs).toStrictEqual([
      {
        code: 'pokemon_50',
        name: 'Elite Pokémon Collectibles Pack',
        shortName: 'PKMN 50',
        category: 'Pokemon',
        price: 50,
        priceAmount: '50000000',
        instantBuybackPercent: 85,
        odds: { common: 0.8, uncommon: 0.15, rare: 0.04, epic: 0.01 },
        tierRanges: machines[0].tierRanges,
        maxValue: 5001,
        menuOrder: 4,
      },
    ]);
  });

  it.each([
    [50, '50000000'],
    [12.5, '12500000'],
    [0.000001, '1'],
  ])('maps a %s USDC price to %s base units', (price, priceAmount) => {
    const [pack] = toPacks(
      [createMachine({ price })],
      createStatus(['pokemon_50']),
    );

    expect(pack.priceAmount).toBe(priceAmount);
  });

  it('keeps the published expected value when supplied', () => {
    const [pack] = toPacks(
      [createMachine({ ev: 48.6 })],
      createStatus(['pokemon_50']),
    );
    expect(pack.expectedValue).toBe(48.6);
  });

  it('excludes private machines', () => {
    const machines = [createMachine({ public: false })];

    const packs = toPacks(machines, createStatus(['pokemon_50']));

    expect(packs).toStrictEqual([]);
  });

  it('includes only explicitly approved private machines when open', () => {
    const machines = [
      createMachine({ code: 'private-approved', public: false }),
      createMachine({ code: 'private-other', public: false }),
    ];
    expect(
      toPacks(machines, createStatus(['private-approved', 'private-other']), [
        'private-approved',
      ]).map((pack) => pack.code),
    ).toEqual(['private-approved']);
    expect(toPacks(machines, createStatus([]), ['private-approved'])).toEqual(
      [],
    );
    expect(
      toPacks([], createStatus(['private-approved']), ['private-approved']),
    ).toEqual([]);
    expect(
      toPacks(
        machines,
        createStatus(['private-approved'], { machineStatus: 'stopped' }),
        ['private-approved'],
      ),
    ).toEqual([]);
  });

  it('excludes machines whose collectibles is closed or missing from status', () => {
    const machines = [
      createMachine({ code: 'sealed_80' }),
      createMachine({ code: 'unknown_1' }),
    ];
    const status = createStatus([], {
      gachas: [{ code: 'sealed_80', status: 'closed' }],
    });

    const packs = toPacks(machines, status);

    expect(packs).toStrictEqual([]);
  });

  it('returns no pack when machines are stopped', () => {
    const machines = [createMachine()];
    const status = createStatus(['pokemon_50'], { machineStatus: 'stopped' });

    const packs = toPacks(machines, status);

    expect(packs).toStrictEqual([]);
  });

  it('sorts by category, then menu order, then price, nulls last', () => {
    const machines = [
      createMachine({ code: 'z', menuCategory: null, menuOrder: 1 }),
      createMachine({ code: 'b', menuCategory: 'Pokemon', menuOrder: 2 }),
      createMachine({ code: 'c', menuCategory: 'Pokemon', menuOrder: null }),
      createMachine({
        code: 'a2',
        menuCategory: 'One Piece',
        menuOrder: 1,
        price: 250,
      }),
      createMachine({
        code: 'a1',
        menuCategory: 'One Piece',
        menuOrder: 1,
        price: 50,
      }),
    ];

    const packs = toPacks(machines, createStatus(['z', 'b', 'c', 'a2', 'a1']));

    expect(packs.map((pack) => pack.code)).toStrictEqual([
      'a1',
      'a2',
      'b',
      'c',
      'z',
    ]);
  });

  it('defaults missing category and menu order to null', () => {
    const machines = [
      createMachine({ menuCategory: undefined, menuOrder: undefined }),
    ];

    const [pack] = toPacks(machines, createStatus(['pokemon_50']));

    expect(pack.category).toBeNull();
    expect(pack.menuOrder).toBeNull();
  });
});
