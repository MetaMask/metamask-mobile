/** Gacha-owned presentation, independent of provider pricing and purchase data. */
export interface PackArtwork {
  name?: string;
  image: number;
  thumbnail: number;
}

// Shared visual identities: equivalent packs from different providers reuse one entry.
// Static require paths allow Metro to bundle only the finished WebP exports.
const GACHA_PACK_ARTWORK = {
  'default-origin': {
    image: require('../assets/pack-artwork/default-origin.webp'),
    thumbnail: require('../assets/pack-artwork/default-origin-list.webp'),
  },
  'pokemon-25-ember': {
    name: 'Pokémon Ember',
    image: require('../assets/pack-artwork/pokemon-25-ember.webp'),
    thumbnail: require('../assets/pack-artwork/pokemon-25-ember-list.webp'),
  },
  'pokemon-50-spark': {
    name: 'Pokémon Spark',
    image: require('../assets/pack-artwork/pokemon-50-spark.webp'),
    thumbnail: require('../assets/pack-artwork/pokemon-50-spark-list.webp'),
  },
  'sealed-80-vault': {
    name: 'Pokémon Vault',
    image: require('../assets/pack-artwork/sealed-80-vault.webp'),
    thumbnail: require('../assets/pack-artwork/sealed-80-vault-list.webp'),
  },
  'pokemon-100-surge': {
    name: 'Pokémon Surge',
    image: require('../assets/pack-artwork/pokemon-100-surge.webp'),
    thumbnail: require('../assets/pack-artwork/pokemon-100-surge-list.webp'),
  },
  'pokemon-250-blaze': {
    name: 'Pokémon Blaze',
    image: require('../assets/pack-artwork/pokemon-250-blaze.webp'),
    thumbnail: require('../assets/pack-artwork/pokemon-250-blaze-list.webp'),
  },
  'pokemon-500-nova': {
    name: 'Pokémon Nova',
    image: require('../assets/pack-artwork/pokemon-500-nova.webp'),
    thumbnail: require('../assets/pack-artwork/pokemon-500-nova-list.webp'),
  },
  'pokemon-1000-zenith': {
    name: 'Pokémon Zenith',
    image: require('../assets/pack-artwork/pokemon-1000-zenith.webp'),
    thumbnail: require('../assets/pack-artwork/pokemon-1000-zenith-list.webp'),
  },
  'pokemon-2500-astral': {
    name: 'Pokémon Astral',
    image: require('../assets/pack-artwork/pokemon-2500-astral.webp'),
    thumbnail: require('../assets/pack-artwork/pokemon-2500-astral-list.webp'),
  },
  'pokemon-5000-genesis': {
    name: 'Pokémon Genesis',
    image: require('../assets/pack-artwork/pokemon-5000-genesis.webp'),
    thumbnail: require('../assets/pack-artwork/pokemon-5000-genesis-list.webp'),
  },
  'onepiece-50-drift': {
    name: 'One Piece Drift',
    image: require('../assets/pack-artwork/onepiece-50-drift.webp'),
    thumbnail: require('../assets/pack-artwork/onepiece-50-drift-list.webp'),
  },
  'onepiece-250-corsair': {
    name: 'One Piece Corsair',
    image: require('../assets/pack-artwork/onepiece-250-corsair.webp'),
    thumbnail: require('../assets/pack-artwork/onepiece-250-corsair-list.webp'),
  },
  'onepiece-1000-crown': {
    name: 'One Piece Crown',
    image: require('../assets/pack-artwork/onepiece-1000-crown.webp'),
    thumbnail: require('../assets/pack-artwork/onepiece-1000-crown-list.webp'),
  },
  'sports-100-pulse': {
    name: 'Sports Pulse',
    image: require('../assets/pack-artwork/sports-100-pulse.webp'),
    thumbnail: require('../assets/pack-artwork/sports-100-pulse-list.webp'),
  },
  'sports-500-legacy': {
    name: 'Sports Legacy',
    image: require('../assets/pack-artwork/sports-500-legacy.webp'),
    thumbnail: require('../assets/pack-artwork/sports-500-legacy-list.webp'),
  },
  'basketball-100-court': {
    name: 'Basketball Court',
    image: require('../assets/pack-artwork/basketball-100-court.webp'),
    thumbnail: require('../assets/pack-artwork/basketball-100-court-list.webp'),
  },
  'basketball-250-flight': {
    name: 'Basketball Flight',
    image: require('../assets/pack-artwork/basketball-250-flight.webp'),
    thumbnail: require('../assets/pack-artwork/basketball-250-flight-list.webp'),
  },
  'baseball-100-pitch': {
    name: 'Baseball Pitch',
    image: require('../assets/pack-artwork/baseball-100-pitch.webp'),
    thumbnail: require('../assets/pack-artwork/baseball-100-pitch-list.webp'),
  },
  'baseball-250-homerun': {
    name: 'Baseball Homerun',
    image: require('../assets/pack-artwork/baseball-250-homerun.webp'),
    thumbnail: require('../assets/pack-artwork/baseball-250-homerun-list.webp'),
  },
  'football-100-drive': {
    name: 'American Football Drive',
    image: require('../assets/pack-artwork/football-100-drive.webp'),
    thumbnail: require('../assets/pack-artwork/football-100-drive-list.webp'),
  },
  'football-250-gridiron': {
    name: 'American Football Gridiron',
    image: require('../assets/pack-artwork/football-250-gridiron.webp'),
    thumbnail: require('../assets/pack-artwork/football-250-gridiron-list.webp'),
  },
  'soccer-50-kick': {
    name: 'Soccer Kick',
    image: require('../assets/pack-artwork/soccer-50-kick.webp'),
    thumbnail: require('../assets/pack-artwork/soccer-50-kick-list.webp'),
  },
  'soccer-100-volley': {
    name: 'Soccer Volley',
    image: require('../assets/pack-artwork/soccer-100-volley.webp'),
    thumbnail: require('../assets/pack-artwork/soccer-100-volley-list.webp'),
  },
  'soccer-250-striker': {
    name: 'Soccer Striker',
    image: require('../assets/pack-artwork/soccer-250-striker.webp'),
    thumbnail: require('../assets/pack-artwork/soccer-250-striker-list.webp'),
  },
  'dragonball-50-ignite': {
    name: 'Dragon Ball Ignite',
    image: require('../assets/pack-artwork/dragonball-50-ignite.webp'),
    thumbnail: require('../assets/pack-artwork/dragonball-50-ignite-list.webp'),
  },
  'dragonball-100-ascend': {
    name: 'Dragon Ball Ascend',
    image: require('../assets/pack-artwork/dragonball-100-ascend.webp'),
    thumbnail: require('../assets/pack-artwork/dragonball-100-ascend-list.webp'),
  },
  'riftbound-100-rune': {
    name: 'Riftbound Rune',
    image: require('../assets/pack-artwork/riftbound-100-rune.webp'),
    thumbnail: require('../assets/pack-artwork/riftbound-100-rune-list.webp'),
  },
  'riftbound-250-rift': {
    name: 'Riftbound Rift',
    image: require('../assets/pack-artwork/riftbound-250-rift.webp'),
    thumbnail: require('../assets/pack-artwork/riftbound-250-rift-list.webp'),
  },
  'ewatch-250-tempo': {
    name: 'Watches Tempo',
    image: require('../assets/pack-artwork/ewatch-250-tempo.webp'),
    thumbnail: require('../assets/pack-artwork/ewatch-250-tempo-list.webp'),
  },
  'ewatch-500-epoch': {
    name: 'Watches Epoch',
    image: require('../assets/pack-artwork/ewatch-500-epoch.webp'),
    thumbnail: require('../assets/pack-artwork/ewatch-500-epoch-list.webp'),
  },
  'anime-75-prism': {
    name: 'Anime Prism',
    image: require('../assets/pack-artwork/anime-75-prism.webp'),
    thumbnail: require('../assets/pack-artwork/anime-75-prism-list.webp'),
  },
} satisfies Record<string, PackArtwork>;

type PackArtworkId = keyof typeof GACHA_PACK_ARTWORK;

// Providers expose their stable codes; Gacha decides which visual identity they use.
// A new provider can map an equivalent Pokémon 50 pack to pokemon-50-spark.
const PROVIDER_PACK_ARTWORK: Record<string, Record<string, PackArtworkId>> = {
  'collector-crypt': {
    pokemon_25: 'pokemon-25-ember',
    pokemon_50: 'pokemon-50-spark',
    sealed_80: 'sealed-80-vault',
    pokemon_100: 'pokemon-100-surge',
    pokemon_250: 'pokemon-250-blaze',
    pokemon_500: 'pokemon-500-nova',
    pokemon_1000: 'pokemon-1000-zenith',
    pokemon_2500: 'pokemon-2500-astral',
    pokemon_5000: 'pokemon-5000-genesis',
    onepiece_50: 'onepiece-50-drift',
    onepiece_250: 'onepiece-250-corsair',
    onepiece_1000: 'onepiece-1000-crown',
    sports_100: 'sports-100-pulse',
    sports_500: 'sports-500-legacy',
    basketball_100: 'basketball-100-court',
    basketball_250: 'basketball-250-flight',
    baseball_100: 'baseball-100-pitch',
    baseball_250: 'baseball-250-homerun',
    football_100: 'football-100-drive',
    football_250: 'football-250-gridiron',
    soccer_50: 'soccer-50-kick',
    soccer_100: 'soccer-100-volley',
    soccer_250: 'soccer-250-striker',
    dragonball_50: 'dragonball-50-ignite',
    dragonball_100: 'dragonball-100-ascend',
    riftbound_100: 'riftbound-100-rune',
    riftbound_250: 'riftbound-250-rift',
    ewatch_250: 'ewatch-250-tempo',
    ewatch_500: 'ewatch-500-epoch',
    anime_75: 'anime-75-prism',
  },
};

/** Returns Gacha artwork for a provider offer; unknown offers retain their API name. */
export const getGachaPackArtwork = (
  provider: string,
  code: string,
): PackArtwork => {
  const packs = Object.hasOwn(PROVIDER_PACK_ARTWORK, provider)
    ? PROVIDER_PACK_ARTWORK[provider]
    : undefined;
  return packs && Object.hasOwn(packs, code)
    ? GACHA_PACK_ARTWORK[packs[code]]
    : GACHA_PACK_ARTWORK['default-origin'];
};
