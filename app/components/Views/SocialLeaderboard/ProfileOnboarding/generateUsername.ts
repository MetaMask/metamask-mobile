/** Server rule: 3–16 characters. */
export const MAX_USERNAME_LENGTH = 16;

// 50 x 50 x 50 = 125,000 combinations

/** Crypto slang / vibe. */
export const PREFIXES = [
  'Bonk',
  'Wen',
  'Mint',
  'Moon',
  'Degen',
  'Alpha',
  'Based',
  'Rekt',
  'Gm',
  'Hodl',
  'Pump',
  'Ape',
  'Gas',
  'Diamond',
  'Lambo',
  'Stake',
  'Flip',
  'Farm',
  'Burn',
  'Snipe',
  'Bridge',
  'Swap',
  'Yield',
  'Airdrop',
  'Dip',
  'Long',
  'Short',
  'Bag',
  'Chad',
  'Wagmi',
  'Ser',
  'Anon',
  'Fomo',
  'Doge',
  'Shill',
  'Wick',
  'Candle',
  'Block',
  'Chain',
  'Hash',
  'Node',
  'Token',
  'Vault',
  'Satoshi',
  'Gwei',
  'Perp',
  'Margin',
  'Pool',
  'Flash',
  'Meme',
] as const;

/** Descriptors. */
export const MIDDLES = [
  'Turbo',
  'Cosmic',
  'Sleepy',
  'Spicy',
  'Frozen',
  'Golden',
  'Neon',
  'Lucky',
  'Rogue',
  'Silent',
  'Chaotic',
  'Mighty',
  'Crispy',
  'Wild',
  'Stealth',
  'Hyper',
  'Cursed',
  'Shiny',
  'Fuzzy',
  'Sneaky',
  'Atomic',
  'Galactic',
  'Electric',
  'Savage',
  'Zen',
  'Rapid',
  'Funky',
  'Mystic',
  'Bold',
  'Lunar',
  'Feral',
  'Cheeky',
  'Ancient',
  'Tiny',
  'Giant',
  'Hungry',
  'Dizzy',
  'Rusty',
  'Solar',
  'Icy',
  'Blazing',
  'Stormy',
  'Quantum',
  'Pixel',
  'Retro',
  'Grumpy',
  'Jolly',
  'Velvet',
  'Sly',
  'Loud',
] as const;

/** Characters / creatures. */
export const SUFFIXES = [
  'Queen',
  'Wizard',
  'Whale',
  'Player',
  'King',
  'Ninja',
  'Shark',
  'Monk',
  'Sage',
  'Baron',
  'Maxi',
  'Knight',
  'Goblin',
  'Oracle',
  'Trader',
  'Pirate',
  'Samurai',
  'Wolf',
  'Frog',
  'Ghost',
  'Phantom',
  'Hunter',
  'Miner',
  'Captain',
  'Bandit',
  'Dragon',
  'Titan',
  'Falcon',
  'Rocket',
  'Jester',
  'Viking',
  'Panda',
  'Tiger',
  'Bear',
  'Bull',
  'Raven',
  'Golem',
  'Druid',
  'Ranger',
  'Nomad',
  'Sultan',
  'Pharaoh',
  'Outlaw',
  'Cobra',
  'Yeti',
  'Shaman',
  'Gecko',
  'Otter',
  'Lynx',
  'Rhino',
] as const;

/** Combos that should never ship. Matched against the final string. */
const BLOCKLIST: RegExp[] = [
  // e.g. /^Short.*Queen$/,
];

const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

/**
 * Onboarding handles are at most 16 characters, so a long combo is treated
 * like a blocklisted one and rolled again.
 */
const isAllowed = (name: string) =>
  name.length <= MAX_USERNAME_LENGTH &&
  !BLOCKLIST.some((pattern) => pattern.test(name));

const buildName = (): string =>
  `${pick(PREFIXES)}${pick(MIDDLES)}${pick(SUFFIXES)}`;

const ROLL_ATTEMPTS = 100;

export function generateUsername(): string {
  for (let i = 0; i < ROLL_ATTEMPTS; i++) {
    const name = buildName();
    if (isAllowed(name)) return name;
  }
  return 'GmZenWolf';
}

/** Used when the server reports a generated name as taken. */
export function generateUsernameWithNumber(): string {
  const n = Math.floor(Math.random() * 900) + 100;
  const suffix = `${n}`;
  const maxBaseLength = MAX_USERNAME_LENGTH - suffix.length;
  for (let i = 0; i < ROLL_ATTEMPTS; i++) {
    const name = buildName();
    if (
      name.length <= maxBaseLength &&
      !BLOCKLIST.some((pattern) => pattern.test(name))
    ) {
      return `${name}${suffix}`;
    }
  }
  return `WenMoon${suffix}`;
}
