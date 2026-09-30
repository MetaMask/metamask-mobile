export interface PackArtwork {
  name?: string;
  image: number;
  thumbnail: number;
}

const DEFAULT_PACK_ARTWORK: PackArtwork = {
  image: require('./artwork/default-origin/pack.webp'),
  thumbnail: require('./artwork/default-origin/pack-list.webp'),
};

const COLLECTOR_CRYPT_PACK_ARTWORK: Record<string, PackArtwork> = {
  pokemon_25: {
    name: 'Pokémon Ember',
    image: require('./artwork/pokemon-25-ember/pack.webp'),
    thumbnail: require('./artwork/pokemon-25-ember/pack-list.webp'),
  },
  pokemon_50: {
    name: 'Pokémon Spark',
    image: require('./artwork/pokemon-50-spark/pack.webp'),
    thumbnail: require('./artwork/pokemon-50-spark/pack-list.webp'),
  },
  sealed_80: {
    name: 'Pokémon Vault',
    image: require('./artwork/sealed-80-vault/pack.webp'),
    thumbnail: require('./artwork/sealed-80-vault/pack-list.webp'),
  },
  pokemon_100: {
    name: 'Pokémon Surge',
    image: require('./artwork/pokemon-100-surge/pack.webp'),
    thumbnail: require('./artwork/pokemon-100-surge/pack-list.webp'),
  },
  pokemon_250: {
    name: 'Pokémon Blaze',
    image: require('./artwork/pokemon-250-blaze/pack.webp'),
    thumbnail: require('./artwork/pokemon-250-blaze/pack-list.webp'),
  },
  pokemon_500: {
    name: 'Pokémon Nova',
    image: require('./artwork/pokemon-500-nova/pack.webp'),
    thumbnail: require('./artwork/pokemon-500-nova/pack-list.webp'),
  },
  pokemon_1000: {
    name: 'Pokémon Zenith',
    image: require('./artwork/pokemon-1000-zenith/pack.webp'),
    thumbnail: require('./artwork/pokemon-1000-zenith/pack-list.webp'),
  },
  pokemon_2500: {
    name: 'Pokémon Astral',
    image: require('./artwork/pokemon-2500-astral/pack.webp'),
    thumbnail: require('./artwork/pokemon-2500-astral/pack-list.webp'),
  },
  pokemon_5000: {
    name: 'Pokémon Genesis',
    image: require('./artwork/pokemon-5000-genesis/pack.webp'),
    thumbnail: require('./artwork/pokemon-5000-genesis/pack-list.webp'),
  },
  onepiece_50: {
    name: 'One Piece Drift',
    image: require('./artwork/onepiece-50-drift/pack.webp'),
    thumbnail: require('./artwork/onepiece-50-drift/pack-list.webp'),
  },
  onepiece_250: {
    name: 'One Piece Corsair',
    image: require('./artwork/onepiece-250-corsair/pack.webp'),
    thumbnail: require('./artwork/onepiece-250-corsair/pack-list.webp'),
  },
  onepiece_1000: {
    name: 'One Piece Crown',
    image: require('./artwork/onepiece-1000-crown/pack.webp'),
    thumbnail: require('./artwork/onepiece-1000-crown/pack-list.webp'),
  },
  sports_100: {
    name: 'Sports Pulse',
    image: require('./artwork/sports-100-pulse/pack.webp'),
    thumbnail: require('./artwork/sports-100-pulse/pack-list.webp'),
  },
  sports_500: {
    name: 'Sports Legacy',
    image: require('./artwork/sports-500-legacy/pack.webp'),
    thumbnail: require('./artwork/sports-500-legacy/pack-list.webp'),
  },
  basketball_100: {
    name: 'Basketball Court',
    image: require('./artwork/basketball-100-court/pack.webp'),
    thumbnail: require('./artwork/basketball-100-court/pack-list.webp'),
  },
  basketball_250: {
    name: 'Basketball Flight',
    image: require('./artwork/basketball-250-flight/pack.webp'),
    thumbnail: require('./artwork/basketball-250-flight/pack-list.webp'),
  },
  baseball_100: {
    name: 'Baseball Pitch',
    image: require('./artwork/baseball-100-pitch/pack.webp'),
    thumbnail: require('./artwork/baseball-100-pitch/pack-list.webp'),
  },
  baseball_250: {
    name: 'Baseball Homerun',
    image: require('./artwork/baseball-250-homerun/pack.webp'),
    thumbnail: require('./artwork/baseball-250-homerun/pack-list.webp'),
  },
  football_100: {
    name: 'American Football Drive',
    image: require('./artwork/football-100-drive/pack.webp'),
    thumbnail: require('./artwork/football-100-drive/pack-list.webp'),
  },
  football_250: {
    name: 'American Football Gridiron',
    image: require('./artwork/football-250-gridiron/pack.webp'),
    thumbnail: require('./artwork/football-250-gridiron/pack-list.webp'),
  },
  soccer_50: {
    name: 'Soccer Kick',
    image: require('./artwork/soccer-50-kick/pack.webp'),
    thumbnail: require('./artwork/soccer-50-kick/pack-list.webp'),
  },
  soccer_100: {
    name: 'Soccer Volley',
    image: require('./artwork/soccer-100-volley/pack.webp'),
    thumbnail: require('./artwork/soccer-100-volley/pack-list.webp'),
  },
  soccer_250: {
    name: 'Soccer Striker',
    image: require('./artwork/soccer-250-striker/pack.webp'),
    thumbnail: require('./artwork/soccer-250-striker/pack-list.webp'),
  },
  dragonball_50: {
    name: 'Dragon Ball Ignite',
    image: require('./artwork/dragonball-50-ignite/pack.webp'),
    thumbnail: require('./artwork/dragonball-50-ignite/pack-list.webp'),
  },
  dragonball_100: {
    name: 'Dragon Ball Ascend',
    image: require('./artwork/dragonball-100-ascend/pack.webp'),
    thumbnail: require('./artwork/dragonball-100-ascend/pack-list.webp'),
  },
  riftbound_100: {
    name: 'Riftbound Rune',
    image: require('./artwork/riftbound-100-rune/pack.webp'),
    thumbnail: require('./artwork/riftbound-100-rune/pack-list.webp'),
  },
  riftbound_250: {
    name: 'Riftbound Rift',
    image: require('./artwork/riftbound-250-rift/pack.webp'),
    thumbnail: require('./artwork/riftbound-250-rift/pack-list.webp'),
  },
  ewatch_250: {
    name: 'Watches Tempo',
    image: require('./artwork/ewatch-250-tempo/pack.webp'),
    thumbnail: require('./artwork/ewatch-250-tempo/pack-list.webp'),
  },
  ewatch_500: {
    name: 'Watches Epoch',
    image: require('./artwork/ewatch-500-epoch/pack.webp'),
    thumbnail: require('./artwork/ewatch-500-epoch/pack-list.webp'),
  },
  anime_75: {
    name: 'Anime Prism',
    image: require('./artwork/anime-75-prism/pack.webp'),
    thumbnail: require('./artwork/anime-75-prism/pack-list.webp'),
  },
};

/** Returns bundled artwork by stable provider code, preserving unknown API names. */
export const getCollectorCryptPackArtwork = (code: string): PackArtwork =>
  Object.hasOwn(COLLECTOR_CRYPT_PACK_ARTWORK, code)
    ? COLLECTOR_CRYPT_PACK_ARTWORK[code]
    : DEFAULT_PACK_ARTWORK;
