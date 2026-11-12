import { createPack } from '../testUtils';
import {
  getPackCollections,
  getVisiblePacks,
  getPopularPacks,
} from './CollectiblesHome.utils';

describe('CollectiblesHome.utils', () => {
  it('ranks seven-day openings without mutating live packs, with stable Core ordering', () => {
    const packs = [
      createPack({ code: 'premium', price: 100 }),
      createPack({ code: 'core', price: 25 }),
    ];
    const popular = getPopularPacks(packs, {
      'pack_partner:premium': {
        openedLast7d: 10,
        pulledSinceLastEpic: 5,
        rarityCounts24h: { common: 0, uncommon: 0, rare: 0, epic: 0 },
      },
    });
    expect(popular.map((pack) => pack.code)).toEqual(['premium', 'core']);
    expect(getPopularPacks(packs).map((pack) => pack.code)).toEqual([
      'core',
      'premium',
    ]);
    expect(packs.map((pack) => pack.code)).toEqual(['premium', 'core']);
  });
  it('returns unique collection labels in the requested display order', () => {
    const pokemon = createPack({ code: 'a', category: 'Pokemon' });
    const onePiece = createPack({
      code: 'b',
      name: 'One Piece',
      category: 'One Piece',
    });
    const pokemonBig = createPack({ code: 'c', category: 'Pokemon' });
    const other = createPack({ code: 'd', name: 'Unknown', category: null });
    const sports = createPack({
      code: 'e',
      name: 'Sports',
      category: 'Sports',
    });
    const others = createPack({
      code: 'f',
      name: 'Others',
      category: 'Others',
    });
    const newCollection = createPack({
      code: 'g',
      name: 'Anime',
      category: 'Anime',
    });

    expect(
      getPackCollections([
        others,
        onePiece,
        pokemon,
        sports,
        pokemonBig,
        other,
        newCollection,
      ]),
    ).toStrictEqual(['Pokémon', 'One Piece', 'Sports', 'Anime', 'Others']);
  });

  it('discovers provider subcategories and keeps Watches ahead of unknown groups', () => {
    const packs = [
      createPack({ code: 'misc', name: 'Other pack', category: 'Others' }),
      createPack({ code: 'watch_500', name: 'Watch', category: 'Pokemon' }),
      createPack({ code: 'dbz_50', name: 'Dragon Ball', category: 'Others' }),
      createPack({
        code: 'basketball_50',
        name: 'Basketball',
        category: 'Sports',
      }),
    ];

    expect(getPackCollections(packs)).toEqual([
      'Basketball',
      'Watches',
      'Dragon Ball',
      'Others',
    ]);
    expect(getVisiblePacks(packs, 'Watches')).toEqual([packs[1]]);
  });

  it('filters a collection and sorts visible packs by ascending price', () => {
    const pokemon = createPack({
      code: 'pokemon',
      category: 'Pokemon',
      price: 50,
    });
    const onePiece = createPack({
      code: 'one-piece',
      category: 'One Piece',
      price: 25,
    });
    const expensivePokemon = createPack({
      code: 'expensive',
      category: 'Pokemon',
      price: 100,
    });

    expect(
      getVisiblePacks([expensivePokemon, onePiece, pokemon], ''),
    ).toStrictEqual([onePiece, pokemon, expensivePokemon]);
    expect(
      getVisiblePacks([expensivePokemon, onePiece, pokemon], 'Pokemon'),
    ).toStrictEqual([pokemon, expensivePokemon]);
  });
});
