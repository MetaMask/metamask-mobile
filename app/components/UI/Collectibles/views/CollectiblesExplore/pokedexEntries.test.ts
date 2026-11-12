import type { PokedexEntry } from '../../services/clients/CollectiblesApiClient';
import { visiblePokedexEntries } from './pokedexEntries';
const entry = (
  id: number,
  name: string,
  unlocked: boolean,
  generation = 1,
): PokedexEntry => ({
  id,
  name,
  unlocked,
  generation,
  imageUrl: '',
  firstOpenedAt: null,
});
const entries = [
  entry(25, 'Pikachu', true),
  entry(1, 'Bulbasaur', false),
  entry(152, 'Chikorita', true, 2),
];
describe('Replit Pokédex filtering', () => {
  it('shows only discoveries in All, including species no longer owned', () => {
    expect(
      visiblePokedexEntries(entries, undefined, '').map(({ id }) => id),
    ).toEqual([25, 152]);
  });
  it('includes locked silhouettes within their generation', () => {
    expect(visiblePokedexEntries(entries, 1, '').map(({ id }) => id)).toEqual([
      1, 25,
    ]);
  });
  it('does not reveal a locked species name through search', () => {
    expect(visiblePokedexEntries(entries, 1, 'Bulbasaur')).toEqual([]);
    expect(
      visiblePokedexEntries(entries, 1, `#${String(1).padStart(4, '0')}`).map(
        ({ id }) => id,
      ),
    ).toEqual([1]);
  });
  it('matches discovered names case-insensitively', () => {
    expect(
      visiblePokedexEntries(entries, undefined, ' PIKA ').map(({ id }) => id),
    ).toEqual([25]);
  });
});
