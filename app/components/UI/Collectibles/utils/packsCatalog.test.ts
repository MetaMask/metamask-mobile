import {
  mockCatalogPacks,
  mockPackCategoryMapping,
} from '#app/components/UI/Collectibles/mocks/packsCatalog';
import type { CatalogPack } from '#app/components/UI/Collectibles/types/packs';
import { buildPacksCatalog, formatPackPrice } from './packsCatalog';

function pack(code: string, priceUsd?: number, isMachineOpen = true) {
  const result: CatalogPack = {
    code,
    name: code,
    openedCount: 0,
    priceUsd,
    isMachineOpen,
  };
  return result;
}

const mapping = {
  categories: [
    { id: 'pokemon', name: 'Pokémon' },
    { id: 'sports', name: 'Sports' },
    { id: 'empty', name: 'Empty' },
  ],
  packCategories: { a: 'sports', b: 'pokemon', c: 'pokemon', d: 'gone' },
};

describe('buildPacksCatalog', () => {
  it('hides packs with a closed machine or no price', () => {
    const { packs } = buildPacksCatalog(
      [pack('a', 10), pack('closed', 10, false), pack('unpriced')],
      mapping,
    );

    expect(packs.map(({ code }) => code)).toEqual(['a']);
  });

  it('sorts by price, then by chip order, with unmapped packs last', () => {
    const { packs } = buildPacksCatalog(
      [pack('x', 25), pack('a', 25), pack('c', 50), pack('b', 25)],
      mapping,
    );

    expect(packs.map(({ code }) => code)).toEqual(['b', 'a', 'x', 'c']);
  });

  it('treats a pack mapped to an unknown category as unmapped', () => {
    const { packs } = buildPacksCatalog([pack('d', 5)], mapping);

    expect(packs[0].categoryId).toBeUndefined();
  });

  it('keeps chip order and drops chips with no open pack', () => {
    const { categories } = buildPacksCatalog(
      [pack('a', 10), pack('b', 20)],
      mapping,
    );

    expect(categories.map(({ id }) => id)).toEqual(['pokemon', 'sports']);
  });

  it('shows every pack by price with no chips when the mapping is missing', () => {
    const { packs, categories } = buildPacksCatalog([
      pack('a', 30),
      pack('b', 10),
    ]);

    expect(categories).toEqual([]);
    expect(packs.map(({ code, categoryId }) => [code, categoryId])).toEqual([
      ['b', undefined],
      ['a', undefined],
    ]);
  });

  it('hides the mock category whose only pack is closed', () => {
    const { categories } = buildPacksCatalog(
      mockCatalogPacks,
      mockPackCategoryMapping,
    );

    expect(categories.map(({ id }) => id)).not.toContain('riftbound');
    expect(categories[0].id).toBe('pokemon');
  });
});

describe('formatPackPrice', () => {
  it.each([
    [25, '$25'],
    [24.5, '$24.50'],
    [1500, '$1,500'],
  ])('formats %d as %s', (price, label) => {
    expect(formatPackPrice(price)).toBe(label);
  });
});
