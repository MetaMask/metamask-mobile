import { createCard } from '../testUtils';
import { pairItems, searchCards } from './CollectiblesSearch.utils';

describe('unified Collectibles search', () => {
  it('deduplicates public discoveries while preserving owned metadata and actions', () => {
    const owned = createCard({ mint: 'shared', name: 'Owned name' });
    const publicCard = createCard({ mint: 'public' });

    const result = searchCards(
      [owned],
      [{ ...owned, name: 'Stale public name' }, publicCard, publicCard],
      '',
    );

    expect(result).toEqual([
      { card: owned, owned: true },
      { card: publicCard, owned: false },
    ]);
  });

  it('matches set, grade, category and ownership without a server search', () => {
    const owned = createCard({
      mint: 'owned',
      set: 'Pokémon paradise',
      grade: 'GEM MINT 10',
      category: 'Pokemon',
    });
    const publicCard = createCard({ mint: 'public', set: 'Jungle' });

    expect(
      searchCards([owned], [publicCard], 'pokemon paradise').map(
        ({ card }) => card.mint,
      ),
    ).toEqual(['owned']);
    expect(searchCards([owned], [publicCard], 'gem mint 10')).toHaveLength(1);
    expect(
      searchCards([owned], [publicCard], 'owned').map(
        ({ owned: isOwned }) => isOwned,
      ),
    ).toEqual([true]);
    expect(searchCards([owned], [publicCard], 'no matching card')).toEqual([]);
  });

  it('keeps the final odd result in the same virtualized two-column layout', () => {
    expect(pairItems(['a', 'b', 'c'])).toEqual([['a', 'b'], ['c']]);
    expect(pairItems([])).toEqual([]);
  });
});
