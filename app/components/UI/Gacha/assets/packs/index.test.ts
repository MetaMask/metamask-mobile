import { getCollectorCryptPackArtwork } from './index';
import catalogue from './catalog/art-direction.json';

// Jest's asset transformer returns only basenames; distinct IDs catch swapped paths.
jest.mock('./artwork/pokemon-25-ember/pack.webp', () => 11);
jest.mock('./artwork/pokemon-25-ember/pack-list.webp', () => 12);
jest.mock('./artwork/pokemon-50-spark/pack.webp', () => 21);
jest.mock('./artwork/pokemon-50-spark/pack-list.webp', () => 22);
jest.mock('./artwork/default-origin/pack.webp', () => 31);
jest.mock('./artwork/default-origin/pack-list.webp', () => 32);

describe('getCollectorCryptPackArtwork', () => {
  it.each([
    ['pokemon_25', 'Pokémon Ember', 11, 12],
    ['pokemon_50', 'Pokémon Spark', 21, 22],
  ] as const)(
    'returns the curated artwork for %s',
    (code, name, image, thumbnail) => {
      const expected = { name, image, thumbnail };

      const artwork = getCollectorCryptPackArtwork(code);

      expect(artwork).toEqual(expected);
    },
  );

  it.each([
    ['onepiece_50', 'One Piece Drift'],
    ['sports_100', 'Sports Pulse'],
    ['sealed_80', 'Pokémon Vault'],
    ['football_100', 'American Football Drive'],
  ])('returns a readable collection name for %s', (code, name) => {
    const expectedName = name;

    const artwork = getCollectorCryptPackArtwork(code);

    expect(artwork.name).toBe(expectedName);
  });

  it.each(
    catalogue.packs.filter((pack) => pack.provider === 'collector-crypt'),
  )('covers the catalogue entry $code', ({ code, displayName }) => {
    const expectedName = displayName;

    const artwork = getCollectorCryptPackArtwork(code);

    expect(artwork.name).toContain(expectedName);
  });

  it.each(['future_pack_75', 'pokemon_75', '', '__proto__', 'constructor'])(
    'returns Origin without replacing the API name for unknown code %s',
    (code) => {
      const expected = { image: 31, thumbnail: 32 };

      const artwork = getCollectorCryptPackArtwork(code);

      expect(artwork).toEqual(expected);
      expect(artwork.name).toBeUndefined();
    },
  );
});
