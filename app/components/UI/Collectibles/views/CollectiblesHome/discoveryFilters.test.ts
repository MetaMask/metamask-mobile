import { createCard, createPack } from '../testUtils';
import { filterPacks, matchesSearch, sortCollection } from './discoveryFilters';

describe('collectibles catalogue filters', () => {
  it('matches accented pack names without case or accent sensitivity', () => {
    const name = 'Pokémon Starter';

    const match = matchesSearch(name, ' POKEMON ');

    expect(match).toBe(true);
  });

  it.each([
    ['Dragon Ball', 'dragonball'],
    ['Dragonball', 'dragon ball'],
  ])('matches the Replit category alias %s with %s', (name, query) => {
    expect(matchesSearch(name, query)).toBe(true);
  });

  it('keeps boundary prices in exactly one range without mutating source order', () => {
    const packs = [500, 25, 501, 100, 99].map((price) =>
      createPack({ code: `pack_${price}`, price }),
    );

    const visible = filterPacks(packs, {
      category: '',
      query: '',
      range: '100to500',
      sort: 'priceAsc',
    });

    expect(visible.map((pack) => pack.price)).toEqual([100, 500]);
    expect(packs.map((pack) => pack.price)).toEqual([500, 25, 501, 100, 99]);
  });

  it('combines category, search, and descending price filters', () => {
    const packs = [
      createPack({ name: 'Ember', category: 'Pokemon', price: 25 }),
      createPack({
        code: 'sports_100',
        name: 'Ember',
        category: 'Sports',
        price: 100,
      }),
      createPack({ name: 'Ember Elite', category: 'Pokemon', price: 50 }),
    ];

    const visible = filterPacks(packs, {
      category: 'Pokemon',
      query: 'ember',
      range: 'all',
      sort: 'priceDesc',
    });

    expect(visible.map((pack) => pack.price)).toEqual([50, 25]);
  });

  it('keeps the mapped name when a provider changes its price', () => {
    const pack = createPack({
      code: 'pokemon_50',
      name: 'Provider title',
      price: 100,
    });
    const options = {
      category: '',
      query: 'Charged',
      range: 'all',
      sort: 'priceAsc',
    } as const;

    const visible = filterPacks([pack], options);
    const inferredNameMatches = filterPacks([pack], {
      ...options,
      query: 'Overdrive',
    });

    expect(visible).toEqual([pack]);
    expect(visible[0].price).toBe(100);
    expect(inferredNameMatches).toEqual([]);
  });

  it('sorts unknown insured values last rather than treating them as zero', () => {
    const cards = [
      createCard({ mint: 'unknown', insuredValue: undefined }),
      createCard({ mint: 'high', insuredValue: 100 }),
      createCard({ mint: 'low', insuredValue: 10 }),
    ];

    const visible = sortCollection(cards, 'valueAsc');

    expect(visible.map((card) => card.mint)).toEqual([
      'low',
      'high',
      'unknown',
    ]);
  });

  it('searches the approved display name and price and orders price ties by category', () => {
    const packs = [
      createPack({
        code: 'sports_25',
        name: 'Sports pack',
        category: 'Sports',
        price: 25,
      }),
      createPack({ code: 'pokemon_25', name: 'Starter Pokemon', price: 25 }),
    ];
    const options = {
      category: '',
      query: 'Core',
      range: 'all',
      sort: 'priceAsc',
    } as const;

    expect(filterPacks(packs, options).map((pack) => pack.code)).toEqual([
      'pokemon_25',
      'sports_25',
    ]);
    expect(filterPacks(packs, { ...options, query: '25' })).toHaveLength(2);
  });
});
