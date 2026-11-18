import type { HomePack } from '../types/packs';

// Mock data until the Collector Crypt (GAC-65), pack (GAC-68) and Social
// (GAC-69) APIs are wired. No art: images will come from a remote host.

function mockAddress(n: number) {
  return `0x${n.toString(16).padStart(40, '0')}`;
}

/** Hardcoded top packs, most sold first. */
export const mockHomePacks: HomePack[] = [
  {
    code: 'pokemon-elite',
    name: 'Pokémon Elite Pack',
    priceUsd: 50,
    isAvailable: true,
    openedLast7Days: 48_210,
    socialCue: {
      name: 'ash.eth',
      othersCount: 312,
      avatarAddress: mockAddress(1),
    },
  },
  {
    code: 'pokemon-starter',
    name: 'Pokémon Starter Pack',
    priceUsd: 25,
    isAvailable: true,
    openedLast7Days: 31_004,
    socialCue: {
      name: 'misty.eth',
      othersCount: 128,
      avatarAddress: mockAddress(2),
    },
  },
  {
    code: 'one-piece-legends',
    name: 'One Piece Legends of the Grand Line Collector Pack',
    priceUsd: 100,
    isAvailable: true,
    openedLast7Days: 20_000,
    socialCue: {
      name: 'luffy.eth',
      othersCount: 87,
      avatarAddress: mockAddress(3),
    },
  },
  {
    code: 'sports-closed',
    name: 'Sports Vault Pack',
    priceUsd: 75,
    // Machine closed: hidden from the carousel
    isAvailable: false,
    openedLast7Days: 19_500,
    socialCue: null,
  },
  {
    code: 'yugioh-classic',
    name: 'Yu-Gi-Oh! Classic Pack',
    priceUsd: 25,
    isAvailable: true,
    openedLast7Days: 19_999,
    socialCue: {
      name: 'yugi.eth',
      othersCount: 54,
      avatarAddress: mockAddress(4),
    },
  },
  {
    code: 'mtg-arena',
    name: 'Magic Arena Pack',
    priceUsd: 50,
    isAvailable: true,
    openedLast7Days: 12_450,
    socialCue: {
      name: 'jace.eth',
      othersCount: 23,
      avatarAddress: mockAddress(5),
    },
  },
  {
    code: 'no-price',
    name: 'Mystery Pack',
    // Missing price: hidden from the carousel
    priceUsd: null,
    isAvailable: true,
    openedLast7Days: 9_800,
    socialCue: null,
  },
  {
    code: 'lorcana-gold',
    name: 'Lorcana Gold Pack',
    priceUsd: 250,
    isAvailable: true,
    openedLast7Days: 8_120,
    socialCue: {
      name: 'elsa.eth',
      othersCount: 12,
      avatarAddress: mockAddress(6),
    },
  },
  {
    code: 'basketball-rookies',
    name: 'Basketball Rookies Pack',
    priceUsd: 50,
    isAvailable: true,
    openedLast7Days: 6_340,
    socialCue: {
      name: 'hoops.eth',
      othersCount: 9,
      avatarAddress: mockAddress(7),
    },
  },
  {
    code: 'baseball-legends',
    name: 'Baseball Legends Pack',
    priceUsd: 100,
    isAvailable: true,
    openedLast7Days: 4_870,
    socialCue: {
      name: 'babe.eth',
      othersCount: 5,
      avatarAddress: mockAddress(8),
    },
  },
  {
    code: 'pokemon-vintage',
    name: 'Pokémon Vintage Pack',
    priceUsd: 500,
    isAvailable: true,
    openedLast7Days: 3_210,
    socialCue: {
      name: 'oak.eth',
      othersCount: 3,
      avatarAddress: mockAddress(9),
    },
  },
  {
    code: 'football-stars',
    name: 'Football Stars Pack',
    priceUsd: 25,
    isAvailable: true,
    openedLast7Days: 1_500,
    socialCue: null,
  },
];

const mockLatencyMs = 400;

export function fetchMockHomePacks() {
  return new Promise<HomePack[]>((resolve) =>
    setTimeout(() => resolve(mockHomePacks), mockLatencyMs),
  );
}
