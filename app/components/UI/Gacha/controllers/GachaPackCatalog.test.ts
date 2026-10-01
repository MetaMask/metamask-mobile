import { getGachaPackArtwork } from './GachaPackCatalog';

// Match Metro's numeric asset sources and distinguish the full/list exports.
jest.mock('../assets/pack-artwork/pokemon-25-ember.webp', () => 11);
jest.mock('../assets/pack-artwork/pokemon-25-ember-list.webp', () => 12);
jest.mock('../assets/pack-artwork/pokemon-50-spark.webp', () => 21);
jest.mock('../assets/pack-artwork/pokemon-50-spark-list.webp', () => 22);
jest.mock('../assets/pack-artwork/default-origin.webp', () => 31);
jest.mock('../assets/pack-artwork/default-origin-list.webp', () => 32);

describe('getGachaPackArtwork', () => {
  it.each([
    ['pokemon_25', 'Pokémon Ember', 11, 12],
    ['pokemon_50', 'Pokémon Spark', 21, 22],
  ] as const)(
    'returns the full and list artwork for Collector Crypt %s',
    (code, name, image, thumbnail) => {
      const expected = { name, image, thumbnail };

      const artwork = getGachaPackArtwork('collector-crypt', code);

      expect(artwork).toEqual(expected);
    },
  );

  it.each([
    ['pokemon_25', 'Pokémon Ember'],
    ['pokemon_50', 'Pokémon Spark'],
    ['sealed_80', 'Pokémon Vault'],
    ['pokemon_100', 'Pokémon Surge'],
    ['pokemon_250', 'Pokémon Blaze'],
    ['pokemon_500', 'Pokémon Nova'],
    ['pokemon_1000', 'Pokémon Zenith'],
    ['pokemon_2500', 'Pokémon Astral'],
    ['pokemon_5000', 'Pokémon Genesis'],
    ['onepiece_50', 'One Piece Drift'],
    ['onepiece_250', 'One Piece Corsair'],
    ['onepiece_1000', 'One Piece Crown'],
    ['sports_100', 'Sports Pulse'],
    ['sports_500', 'Sports Legacy'],
    ['basketball_100', 'Basketball Court'],
    ['basketball_250', 'Basketball Flight'],
    ['baseball_100', 'Baseball Pitch'],
    ['baseball_250', 'Baseball Homerun'],
    ['football_100', 'American Football Drive'],
    ['football_250', 'American Football Gridiron'],
    ['soccer_50', 'Soccer Kick'],
    ['soccer_100', 'Soccer Volley'],
    ['soccer_250', 'Soccer Striker'],
    ['dragonball_50', 'Dragon Ball Ignite'],
    ['dragonball_100', 'Dragon Ball Ascend'],
    ['riftbound_100', 'Riftbound Rune'],
    ['riftbound_250', 'Riftbound Rift'],
    ['ewatch_250', 'Watches Tempo'],
    ['ewatch_500', 'Watches Epoch'],
    ['anime_75', 'Anime Prism'],
  ])('preserves the curated identity of %s', (code, expectedName) => {
    const provider = 'collector-crypt';

    const artwork = getGachaPackArtwork(provider, code);

    expect(artwork.name).toBe(expectedName);
    expect(artwork.image).not.toBe(31);
    expect(artwork.thumbnail).not.toBe(32);
  });

  it.each(['future_pack_75', 'pokemon_75', '', '__proto__', 'constructor'])(
    'returns Origin without replacing the API name for unknown code %s',
    (code) => {
      const expected = { image: 31, thumbnail: 32 };

      const artwork = getGachaPackArtwork('collector-crypt', code);

      expect(artwork).toEqual(expected);
      expect(artwork.name).toBeUndefined();
    },
  );

  it.each(['future-provider', '', '__proto__', 'constructor'])(
    'does not reuse a Collector Crypt mapping for unknown provider %s',
    (provider) => {
      const code = 'pokemon_50';

      const artwork = getGachaPackArtwork(provider, code);

      expect(artwork).toEqual({ image: 31, thumbnail: 32 });
    },
  );
});
