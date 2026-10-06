import { createPack } from '../testUtils';
import {
  getPackCollections,
  getVisiblePacks,
  getVisibleTab,
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

  it.each([
    [{ hasCards: false, isLoading: false, hasSyncError: false }, true],
    [{ hasCards: false, isLoading: true, hasSyncError: false }, false],
    [{ hasCards: false, isLoading: false, hasSyncError: true }, false],
    [{ hasCards: true, isLoading: false, hasSyncError: false }, false],
  ])('keeps the user on Packs for %o: %s', (availability, expected) => {
    expect(shouldStayOnPacks(availability)).toBe(expected);
  });

  it('shows Packs instead of My cards once the account has no card left', () => {
    const tab = getVisibleTab({
      tab: 'cards',
      hasCards: false,
      isLoading: false,
      hasSyncError: false,
    });

    expect(tab).toBe('packs');
  });

  it('keeps My cards visible while syncing or after a failed sync', () => {
    const availability = { tab: 'cards', hasCards: false } as const;

    expect(
      getVisibleTab({ ...availability, isLoading: true, hasSyncError: false }),
    ).toBe('cards');
    expect(
      getVisibleTab({ ...availability, isLoading: false, hasSyncError: true }),
    ).toBe('cards');
  });

  it('never redirects the Packs or Dev tabs', () => {
    const availability = {
      hasCards: false,
      isLoading: false,
      hasSyncError: false,
    };

    expect(getVisibleTab({ ...availability, tab: 'packs' })).toBe('packs');
    expect(getVisibleTab({ ...availability, tab: 'dev' })).toBe('dev');
  });
});
