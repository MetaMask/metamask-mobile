import { create } from '@metamask/superstruct';
import { RECENT_OPENINGS_LIMIT } from '../constants/packPartner';
import { PpWinnerStruct, type PpWinner } from '../schemas/packPartner';
import { recentOpening } from '../services/api.fixtures';
import type { PackPartnerOpening } from '../types/openings';
import {
  mergeOpenings,
  openingFromWinner,
  openingsFromWinners,
} from './openings';

const OPENED_AT = '2026-10-13T20:00:00.000Z';

const winner = (overrides: Partial<PpWinner> = {}): PpWinner => ({
  ...create(recentOpening, PpWinnerStruct),
  ...overrides,
});

/** ISO time `minutes` after the reference opening. */
const minutesLater = (minutes: number): string =>
  new Date(Date.parse(OPENED_AT) + minutes * 60_000).toISOString();

/** Public opening event number `index`, opened `index` minutes after the reference. */
const openingEvent = (
  index: number,
  overrides: Partial<PackPartnerOpening> = {},
): PackPartnerOpening => ({
  id: `event-${index}`,
  mint: `mint-${index}`,
  name: `Card ${index}`,
  openedAt: Date.parse(minutesLater(index)),
  sourcePackCode: 'pokemon_50',
  ...overrides,
});

describe('openingFromWinner', () => {
  it('maps a PackPartner winner to a public opening event', () => {
    const opening = openingFromWinner(winner());

    expect(opening).toMatchObject({
      id: `${recentOpening.nft_address}:${OPENED_AT}:${recentOpening.winner}`,
      mint: recentOpening.nft_address,
      name: recentOpening.nft.description,
      insuredValue: 450,
      rarity: 'epic',
      openedAt: Date.parse(OPENED_AT),
      sourcePackCode: recentOpening.pack_type,
      openerAddress: recentOpening.winner,
    });
    expect(opening).not.toHaveProperty('buyback');
    expect(opening).not.toHaveProperty('acquiredAt');
  });

  it.each([
    [1, 'epic'],
    [2, 'rare'],
    [3, 'uncommon'],
    [4, 'common'],
  ] as const)('maps prize tier %i to %s', (prizeTier, rarity) => {
    const opening = openingFromWinner(winner({ prize_tier: prizeTier }));

    expect(opening.rarity).toBe(rarity);
  });

  it('leaves the rarity unknown without a prize tier', () => {
    const opening = openingFromWinner(winner({ prize_tier: null }));

    expect(opening).not.toHaveProperty('rarity');
  });

  it('uses the insured value of the opening over the pool value of the NFT', () => {
    const opening = openingFromWinner(winner({ insuredValue: '1,250' }));

    expect(opening.insuredValue).toBe(1250);
  });

  it('identifies an event by its instant, whatever the time format', () => {
    const utc = openingFromWinner(winner({ created_at: OPENED_AT }));
    const offset = openingFromWinner(
      winner({ created_at: '2026-10-13T22:00:00+02:00' }),
    );

    expect(offset.id).toBe(utc.id);
  });
});

describe('openingsFromWinners', () => {
  it('keeps every pack for an empty pack code', () => {
    const openings = openingsFromWinners(
      [
        winner(),
        winner({ nft_address: 'other-mint', pack_type: 'onepiece_50' }),
      ],
      '',
    );

    expect(openings.map(({ sourcePackCode }) => sourcePackCode)).toEqual([
      recentOpening.pack_type,
      'onepiece_50',
    ]);
  });

  it('keeps only the openings of the requested pack', () => {
    const openings = openingsFromWinners(
      [
        winner(),
        winner({ nft_address: 'other-mint', pack_type: 'onepiece_50' }),
      ],
      recentOpening.pack_type,
    );

    expect(openings.map(({ mint }) => mint)).toEqual([
      recentOpening.nft_address,
    ]);
  });

  it('keeps one entry per opening event', () => {
    const openings = openingsFromWinners(
      [winner(), winner(), winner({ created_at: '2026-10-13T22:00:00+02:00' })],
      '',
    );

    expect(openings).toHaveLength(1);
  });

  it('keeps two openings of one mint as two events', () => {
    const openings = openingsFromWinners(
      [
        winner(),
        winner({ created_at: minutesLater(5) }),
        winner({ winner: 'YetAnotherCollector' }),
      ],
      '',
    );

    expect(openings).toHaveLength(3);
    expect(new Set(openings.map(({ mint }) => mint))).toEqual(
      new Set([recentOpening.nft_address]),
    );
    expect(new Set(openings.map(({ id }) => id)).size).toBe(3);
  });

  it('sorts openings newest first', () => {
    const openings = openingsFromWinners(
      [
        winner({ nft_address: 'oldest', created_at: minutesLater(0) }),
        winner({ nft_address: 'newest', created_at: minutesLater(10) }),
        winner({ nft_address: 'middle', created_at: minutesLater(5) }),
      ],
      '',
    );

    expect(openings.map(({ mint }) => mint)).toEqual([
      'newest',
      'middle',
      'oldest',
    ]);
  });

  it('returns at most the newest twenty openings', () => {
    const winners = Array.from(
      { length: RECENT_OPENINGS_LIMIT + 5 },
      (_, index) =>
        winner({
          nft_address: `mint-${index}`,
          created_at: minutesLater(index),
        }),
    );

    const openings = openingsFromWinners(winners, '');

    expect(RECENT_OPENINGS_LIMIT).toBe(20);
    expect(openings).toHaveLength(RECENT_OPENINGS_LIMIT);
    expect(openings[0].mint).toBe(`mint-${RECENT_OPENINGS_LIMIT + 4}`);
    expect(openings[RECENT_OPENINGS_LIMIT - 1].mint).toBe('mint-5');
  });

  it('returns no openings for no winners', () => {
    expect(openingsFromWinners([], 'pokemon_50')).toEqual([]);
  });
});

describe('mergeOpenings', () => {
  it('adds a live opening to the snapshot, newest first', () => {
    const snapshot = [openingEvent(2), openingEvent(1)];

    const merged = mergeOpenings(snapshot, [openingEvent(3)]);

    expect(merged.map(({ id }) => id)).toEqual([
      'event-3',
      'event-2',
      'event-1',
    ]);
  });

  it('keeps one entry for a live opening the snapshot already holds', () => {
    const snapshot = [openingEvent(2), openingEvent(1)];

    const merged = mergeOpenings(snapshot, [openingEvent(2), openingEvent(2)]);

    expect(merged.map(({ id }) => id)).toEqual(['event-2', 'event-1']);
  });

  it('keeps the REST fields a live duplicate leaves undefined', () => {
    const snapshot = [
      openingEvent(1, { grade: '10', gradingCompany: 'PSA', insuredValue: 40 }),
    ];

    const merged = mergeOpenings(snapshot, [
      openingEvent(1, {
        grade: undefined,
        gradingCompany: undefined,
        insuredValue: 42,
      }),
    ]);

    expect(merged).toEqual([
      openingEvent(1, { grade: '10', gradingCompany: 'PSA', insuredValue: 42 }),
    ]);
  });

  it('keeps two openings of one mint as two events', () => {
    const snapshot = [openingEvent(1)];

    const merged = mergeOpenings(snapshot, [
      openingEvent(2, { mint: openingEvent(1).mint }),
    ]);

    expect(merged).toHaveLength(2);
    expect(new Set(merged.map(({ mint }) => mint))).toEqual(
      new Set([openingEvent(1).mint]),
    );
  });

  it('keeps only the newest twenty openings', () => {
    const snapshot = Array.from({ length: RECENT_OPENINGS_LIMIT }, (_, index) =>
      openingEvent(index),
    );
    const incoming = Array.from({ length: 5 }, (_, index) =>
      openingEvent(RECENT_OPENINGS_LIMIT + index),
    );

    const merged = mergeOpenings(snapshot, incoming);

    expect(merged).toEqual(
      Array.from({ length: RECENT_OPENINGS_LIMIT }, (_, index) =>
        openingEvent(RECENT_OPENINGS_LIMIT + 4 - index),
      ),
    );
  });

  it('drops a live opening older than the twenty newest ones', () => {
    const snapshot = Array.from({ length: RECENT_OPENINGS_LIMIT }, (_, index) =>
      openingEvent(index + 1),
    );

    const merged = mergeOpenings(snapshot, [openingEvent(0)]);

    expect(merged.map(({ id }) => id)).not.toContain('event-0');
    expect(merged).toHaveLength(RECENT_OPENINGS_LIMIT);
  });

  it('sorts a snapshot without live openings newest first', () => {
    const snapshot = [openingEvent(1), openingEvent(3), openingEvent(2)];

    const merged = mergeOpenings(snapshot, []);

    expect(merged.map(({ id }) => id)).toEqual([
      'event-3',
      'event-2',
      'event-1',
    ]);
  });

  it('returns the live openings when the snapshot is empty', () => {
    const merged = mergeOpenings([], [openingEvent(1), openingEvent(2)]);

    expect(merged).toEqual([openingEvent(2), openingEvent(1)]);
  });

  it('leaves the snapshot and the live openings unchanged', () => {
    const snapshot = [openingEvent(1, { grade: '10' })];
    const incoming = [openingEvent(1, { grade: undefined, insuredValue: 42 })];
    const snapshotCopy = snapshot.map((event) => ({ ...event }));
    const incomingCopy = incoming.map((event) => ({ ...event }));

    mergeOpenings(snapshot, incoming);

    expect(snapshot).toStrictEqual(snapshotCopy);
    expect(incoming).toStrictEqual(incomingCopy);
  });
});
