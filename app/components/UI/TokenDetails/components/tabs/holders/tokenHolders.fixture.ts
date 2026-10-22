import type { FeedItem, FeedResponse } from '@metamask/social-controllers';

/**
 * Stand-in holders page for dev builds, in the shape Social agreed for
 * `GET /api/v1/positions/:assetId`: a feed response whose items are positions
 * with the trader attached, already sorted by position value descending.
 *
 * Only `tokenHoldersQueries` reads this, and only while `__DEV__` is true --
 * see the comment there. Everything in here is invented, and the row renders
 * it unmarked, so treat anything this tab shows in a dev build as fake.
 */

const TOKEN = {
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chain: 'ethereum',
} as const;

interface HolderSeed {
  profileId: string;
  address: string;
  name: string;
  imageUrl: string | null;
  followerCount: number;
  /** Current USD value of the holding. Drives the row's top line. */
  currentValueUSD: number;
  /** Unrealized P&L as a percent of cost basis. Drives the colored line. */
  pnlPercent: number;
  isOpen: boolean;
}

// Descending by `currentValueUSD`, the way the route is expected to sort.
// Mixed signs on `pnlPercent`, plus one exited position so the `isOpen`
// filter has something to drop.
const HOLDER_SEEDS: HolderSeed[] = [
  {
    profileId: '6d7f1f0a-0b7a-4f2b-9c3c-1a3f0c5a9e01',
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    name: 'frogwhale.eth',
    imageUrl: null,
    followerCount: 48707,
    currentValueUSD: 2_418_330.12,
    pnlPercent: 212.48,
    isOpen: true,
  },
  {
    profileId: '2b1c8e44-55a9-4a0e-9f8d-7c2e4b6a1f02',
    address: '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    name: 'degenmachine',
    imageUrl: null,
    followerCount: 12840,
    currentValueUSD: 884_215.4,
    pnlPercent: -18.03,
    isOpen: true,
  },
  {
    profileId: '9a4d2c71-8f36-41d2-a5b4-6e9d0c3f7a03',
    address: '0x28c6c06298d514db089934071355e5743bf21d60',
    name: 'liquidity.sol',
    imageUrl: null,
    followerCount: 7321,
    currentValueUSD: 412_900,
    pnlPercent: 64.9,
    isOpen: true,
  },
  {
    profileId: '0c53f8a2-4e17-4ba9-8d61-2f7b5c9e4a04',
    address: '0x21a31ee1afc51d94c2efccaa2092ad1028285549',
    name: 'nocoiner.eth',
    imageUrl: null,
    followerCount: 2104,
    currentValueUSD: 157_440.75,
    pnlPercent: -42.17,
    isOpen: true,
  },
  {
    profileId: '7e92b0d5-3c48-4f61-b2a7-8d1e6f0c5a05',
    address: '0xdfd5293d8e347dfe59e90efd55b2956a1343963d',
    name: 'ribbit',
    imageUrl: null,
    followerCount: 968,
    currentValueUSD: 89_112.08,
    pnlPercent: 7.44,
    isOpen: true,
  },
  {
    profileId: '4f81a6c3-9d20-4e85-a173-5b8c2e7d0a06',
    address: '0x56eddb7aa87536c09ccc2793473599fd21a8b17f',
    name: 'swampfund',
    imageUrl: null,
    followerCount: 431,
    currentValueUSD: 31_605.5,
    pnlPercent: -3.12,
    isOpen: true,
  },
  {
    profileId: '1d60e9b7-7a54-4c38-9e02-3f6a8d1c4b07',
    address: '0x9696f59e4d72e237be84ffd425dcad154bf96976',
    name: 'tadpole.eth',
    imageUrl: null,
    followerCount: 87,
    currentValueUSD: 4_280.9,
    pnlPercent: 128.6,
    isOpen: true,
  },
  {
    profileId: '8c37d4f1-6b29-4a70-b8e5-0d4c7f2a9b08',
    address: '0x4976a4a02f38326660d17bf34b431dc6e2eb2327',
    name: 'smallbags',
    imageUrl: null,
    followerCount: 1,
    currentValueUSD: 612.37,
    pnlPercent: -61.8,
    isOpen: true,
  },
  {
    profileId: '5a08c2e6-1f43-4d97-8b60-9e2d5c7a3b09',
    address: '0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2',
    name: 'dustholder',
    imageUrl: null,
    followerCount: 0,
    currentValueUSD: 12.04,
    pnlPercent: 2.1,
    isOpen: true,
  },
  // Exited: the list must not show it, even though the route may return it.
  {
    profileId: '3b7e1a9c-2d56-4f08-9a41-7c0b6e3d2a10',
    address: '0x0d0707963952f2fba59dd06f2b425ace40b492fe',
    name: 'tookprofit.eth',
    imageUrl: null,
    followerCount: 15230,
    currentValueUSD: 0,
    pnlPercent: 340.2,
    isOpen: false,
  },
];

/** Unix seconds; fixed so snapshots and relative ages stay deterministic. */
const FIXTURE_TIMESTAMP = 1_760_000_000;

const toFeedItem = (seed: HolderSeed, index: number): FeedItem => {
  const costBasis = seed.currentValueUSD / (1 + seed.pnlPercent / 100);
  const timestamp = FIXTURE_TIMESTAMP - index * 3_600;
  return {
    ...TOKEN,
    positionId: `token-holders-fixture-${index}`,
    positionAmount: Math.round(seed.currentValueUSD * 1_000),
    isOpen: seed.isOpen,
    boughtUsd: costBasis,
    soldUsd: seed.isOpen ? 0 : costBasis + (seed.currentValueUSD || costBasis),
    realizedPnl: seed.isOpen ? 0 : costBasis * (seed.pnlPercent / 100),
    costBasis,
    currentValueUSD: seed.currentValueUSD,
    pnlValueUsd: seed.currentValueUSD - costBasis,
    pnlPercent: seed.pnlPercent,
    trades: [],
    lastTradeAt: timestamp,
    timestamp,
    actor: {
      profileId: seed.profileId,
      address: seed.address,
      name: seed.name,
      imageUrl: seed.imageUrl,
      winRate30d: 0.5,
      pnl30d: seed.currentValueUSD - costBasis,
      tradeCount30d: 24,
      followerCount: seed.followerCount,
    },
  };
};

export const TOKEN_HOLDERS_FIXTURE: FeedResponse = {
  // Called with both arguments explicitly: `toFeedItem` reads the index, and
  // passing it bare would also hand it `map`'s third argument.
  items: HOLDER_SEEDS.map((seed, index) => toFeedItem(seed, index)),
  // A single page: the fixture has no cursor to page through, so the list
  // stops after it rather than replaying the same rows.
  pagination: { olderCursor: null, newerCursor: null },
};
