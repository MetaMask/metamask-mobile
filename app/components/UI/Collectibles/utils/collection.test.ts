import { strings } from '../../../../../locales/i18n';
import type { PackPartnerCard } from '#app/components/UI/Collectibles/providers/pack-partner/types/packPartner';
import {
  getBuybackLabel,
  getCollectionValue,
  searchCardsByName,
  sortNewestFirst,
} from '#app/components/UI/Collectibles/utils/collection';

const now = 1_000_000_000_000;
const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;

function card(overrides: Partial<PackPartnerCard> = {}): PackPartnerCard {
  return {
    mint: 'card-1',
    name: 'Lorem ipsum',
    insuredValue: 100,
    acquiredAt: now - hourMs,
    buyback: { status: 'available' },
    ...overrides,
  };
}

describe('getCollectionValue', () => {
  it('sums the insured values', () => {
    expect(
      getCollectionValue([
        card({ insuredValue: 100 }),
        card({ insuredValue: 25 }),
      ]),
    ).toBe(125);
  });

  it('counts a missing insured value as 0', () => {
    expect(
      getCollectionValue([card({ insuredValue: undefined }), card()]),
    ).toBe(100);
  });

  it('is 0 without cards', () => {
    expect(getCollectionValue([])).toBe(0);
  });
});

describe('sortNewestFirst', () => {
  it('puts the most recently received card first', () => {
    const sorted = sortNewestFirst([
      card({ mint: 'old', acquiredAt: now - 2 * hourMs }),
      card({ mint: 'new', acquiredAt: now }),
    ]);

    expect(sorted.map(({ mint }) => mint)).toEqual(['new', 'old']);
  });
});

describe('searchCardsByName', () => {
  const cards = [
    card({ mint: 'a', name: 'Lorem ipsum' }),
    card({ mint: 'b', name: 'Dolor' }),
  ];

  it('matches the card name ignoring case', () => {
    expect(searchCardsByName(cards, 'LOREM').map(({ mint }) => mint)).toEqual([
      'a',
    ]);
  });

  it('keeps every card for a blank query', () => {
    expect(searchCardsByName(cards, '  ')).toHaveLength(2);
  });
});

describe('getBuybackLabel', () => {
  it('counts the hours left', () => {
    expect(getBuybackLabel(card({ acquiredAt: now - 2 * hourMs }), now)).toBe(
      strings('collectibles.collection.buyback_hours', { count: 70 }),
    );
  });

  it('counts the minutes left under one hour', () => {
    expect(
      getBuybackLabel(
        card({ acquiredAt: now - 72 * hourMs + 30 * minuteMs }),
        now,
      ),
    ).toBe(strings('collectibles.collection.buyback_minutes', { count: 30 }));
  });

  it('is hidden once the 72 hour window has closed', () => {
    expect(
      getBuybackLabel(card({ acquiredAt: now - 72 * hourMs }), now),
    ).toBeUndefined();
  });

  it('is hidden when the buyback is not available', () => {
    expect(
      getBuybackLabel(card({ buyback: { status: 'unavailable' } }), now),
    ).toBeUndefined();
  });

  it('is hidden when the receive time is unknown', () => {
    expect(getBuybackLabel(card({ acquiredAt: 0 }), now)).toBeUndefined();
  });
});
