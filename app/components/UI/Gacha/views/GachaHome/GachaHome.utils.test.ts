import { createPack } from '../testUtils';
import {
  getPackCollections,
  getVisiblePacks,
  shouldStayOnPacks,
} from './GachaHome.utils';

describe('GachaHome.utils', () => {
  it('returns unique collection labels in the requested display order', () => {
    const pokemon = createPack({ code: 'a', category: 'Pokemon' });
    const onePiece = createPack({ code: 'b', category: 'One Piece' });
    const pokemonBig = createPack({ code: 'c', category: 'Pokemon' });
    const other = createPack({ code: 'd', category: null });
    const sports = createPack({ code: 'e', category: 'Sports' });
    const others = createPack({ code: 'f', category: 'Others' });
    const newCollection = createPack({ code: 'g', category: 'Anime' });

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
    ).toStrictEqual(['Pokemon', 'One Piece', 'Sports', 'Others', 'Anime']);
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

  it('keeps the user on Packs only when there is no card and nothing loads', () => {
    expect(shouldStayOnPacks({ hasCards: false, isLoading: false })).toBe(true);
    expect(shouldStayOnPacks({ hasCards: false, isLoading: true })).toBe(false);
    expect(shouldStayOnPacks({ hasCards: true, isLoading: false })).toBe(false);
  });
});
