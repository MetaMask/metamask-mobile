export const MAX_USERNAME_LENGTH = 20;

// 50 x 50 x 50 = 125,000 combinations

/** Crypto slang / vibe. */
export const PREFIXES = [
  'bonk',
  'wen',
  'mint',
  'moon',
  'degen',
  'alpha',
  'based',
  'rekt',
  'gm',
  'hodl',
  'pump',
  'ape',
  'gas',
  'diamond',
  'lambo',
  'stake',
  'flip',
  'farm',
  'burn',
  'snipe',
  'bridge',
  'swap',
  'yield',
  'airdrop',
  'dip',
  'long',
  'short',
  'bag',
  'chad',
  'wagmi',
  'ser',
  'anon',
  'fomo',
  'doge',
  'shill',
  'wick',
  'candle',
  'block',
  'chain',
  'hash',
  'node',
  'token',
  'vault',
  'satoshi',
  'gwei',
  'perp',
  'margin',
  'pool',
  'flash',
  'meme',
] as const;

/** Descriptors. */
export const MIDDLES = [
  'turbo',
  'cosmic',
  'sleepy',
  'spicy',
  'frozen',
  'golden',
  'neon',
  'lucky',
  'rogue',
  'silent',
  'chaotic',
  'mighty',
  'crispy',
  'wild',
  'stealth',
  'hyper',
  'cursed',
  'shiny',
  'fuzzy',
  'sneaky',
  'atomic',
  'galactic',
  'electric',
  'savage',
  'zen',
  'rapid',
  'funky',
  'mystic',
  'bold',
  'lunar',
  'feral',
  'cheeky',
  'ancient',
  'tiny',
  'giant',
  'hungry',
  'dizzy',
  'rusty',
  'solar',
  'icy',
  'blazing',
  'stormy',
  'quantum',
  'pixel',
  'retro',
  'grumpy',
  'jolly',
  'velvet',
  'sly',
  'loud',
] as const;

/** Characters / creatures. */
export const SUFFIXES = [
  'queen',
  'wizard',
  'whale',
  'player',
  'king',
  'ninja',
  'shark',
  'monk',
  'sage',
  'baron',
  'maxi',
  'knight',
  'goblin',
  'oracle',
  'trader',
  'pirate',
  'samurai',
  'wolf',
  'frog',
  'ghost',
  'phantom',
  'hunter',
  'miner',
  'captain',
  'bandit',
  'dragon',
  'titan',
  'falcon',
  'rocket',
  'jester',
  'viking',
  'panda',
  'tiger',
  'bear',
  'bull',
  'raven',
  'golem',
  'druid',
  'ranger',
  'nomad',
  'sultan',
  'pharaoh',
  'outlaw',
  'cobra',
  'yeti',
  'shaman',
  'gecko',
  'otter',
  'lynx',
  'rhino',
] as const;

/** Combos that should never ship. Matched against the final string. */
const BLOCKLIST: RegExp[] = [
  // e.g. /short-.*-queen/,
];

const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

/**
 * Onboarding handles are at most 20 characters, so a long combo is treated
 * like a blocklisted one and rolled again.
 */
const isAllowed = (name: string) =>
  name.length <= MAX_USERNAME_LENGTH &&
  !BLOCKLIST.some((pattern) => pattern.test(name));

const buildName = (): string =>
  `${pick(PREFIXES)}-${pick(MIDDLES)}-${pick(SUFFIXES)}`;

export function generateUsername(): string {
  // Retry a few times in case a blocklisted or over-long combo comes up.
  for (let i = 0; i < 5; i++) {
    const name = buildName();
    if (isAllowed(name)) return name;
  }
  const fallback = buildName();
  return isAllowed(fallback) ? fallback : 'wen-turbo-queen';
}

/** Fallback for when the server says the name is taken repeatedly. */
export function generateUsernameWithNumber(): string {
  const n = Math.floor(Math.random() * 900) + 100;
  for (let i = 0; i < 8; i++) {
    const name = `${generateUsername()}-${n}`;
    if (isAllowed(name)) return name;
  }
  return `wen-moon-${n}`;
}
