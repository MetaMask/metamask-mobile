import type { IndexedPack, Pokedex } from './CollectiblesApiClient';
import type {
  CollectiblesCardFeedItem,
  CollectiblesComment,
  CollectiblesPackFeedItem,
  CollectiblesSocialApiClient,
  CollectiblesSocialProfile,
  PackSocialContext,
} from './CollectiblesSocialApiClient';

const collector: CollectiblesSocialProfile = {
  profileId: 'collector',
  displayName: 'You',
  username: 'collector',
  avatarUrl: null,
  bio: 'Building a collection, one pack at a time.',
  followerCount: 12,
  isFollowing: false,
  accounts: [{ namespace: 'solana', address: 'sample-collector' }],
  leaderboardOptIn: true,
};

const maya: CollectiblesSocialProfile = {
  profileId: 'maya',
  displayName: 'Maya',
  username: 'mayacollects',
  avatarUrl: null,
  bio: 'Collecting Pokémon and sharing the best pulls.',
  followerCount: 248,
  isFollowing: true,
  accounts: [{ namespace: 'solana', address: 'sample-maya' }],
  leaderboardOptIn: true,
};

const alex: CollectiblesSocialProfile = {
  profileId: 'alex',
  displayName: 'Alex',
  username: 'alexcards',
  avatarUrl: null,
  bio: 'Graded cards and the occasional lucky pull.',
  followerCount: 182,
  isFollowing: false,
  accounts: [{ namespace: 'solana', address: 'sample-alex' }],
  leaderboardOptIn: true,
};

const pack: IndexedPack = {
  packId: 'sample-pack-ember',
  revision: 2,
  chainId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  packType: 'pack_partner:pokemon_25',
  packName: 'Pokémon Ember',
  status: 'opened',
  buyer: { namespace: 'solana', address: 'sample-maya' },
  recipient: { namespace: 'solana', address: 'sample-maya' },
  purchase: {
    occurredAt: '2026-11-05T11:00:00Z',
    transactionId: 'sample-purchase',
    amount: '25000000',
    token: { id: 'sample-usdc', decimals: 6 },
    amountUsd: '25',
  },
  opening: {
    occurredAt: '2026-11-05T11:01:00Z',
    transactionId: 'sample-opening',
  },
  buyback: null,
  card: {
    cardId: 'sample-card-treecko',
    name: 'EX Team Rocket Returns',
    imageUrl:
      'https://d1xpxki1g4htqu.cloudfront.net/VZHiY0NIp8kw6DEr7_6AYjQLegZ83Fu5cM-gceMazl8',
    thumbnailUrl:
      'https://d1xpxki1g4htqu.cloudfront.net/VZHiY0NIp8kw6DEr7_6AYjQLegZ83Fu5cM-gceMazl8',
    rarity: 'epic',
    insuredValue: '500',
    pokedexEntryId: 252,
    grade: 'PSA 10',
  },
  turbo: false,
  enrichmentStatus: 'complete',
};

const post: CollectiblesPackFeedItem = {
  itemId: 'sample-feed-ember',
  type: 'collectibles_pack',
  actor: maya,
  timestamp: '2026-11-05T11:01:00Z',
  engagement: { likes: 24, comments: 1, likedByViewer: false },
  data: { pack, caption: 'A new addition to my collection!' },
};

const cardPost: CollectiblesCardFeedItem = {
  itemId: 'sample-card-post',
  type: 'collectibles_cards',
  actor: collector,
  timestamp: '2026-11-05T12:00:00Z',
  engagement: { likes: 0, comments: 0, likedByViewer: false },
  data: {
    cards: [
      {
        provider: 'pack-partner',
        mint: 'sample-card-treecko',
        name: 'EX Team Rocket Returns',
        imageUrl:
          'https://d1xpxki1g4htqu.cloudfront.net/VZHiY0NIp8kw6DEr7_6AYjQLegZ83Fu5cM-gceMazl8',
        insuredValueUsd: '500',
        rarity: 'epic',
        grade: 'PSA 10',
      },
    ],
    caption: 'My latest card',
  },
};

const comment: CollectiblesComment = {
  commentId: 'sample-comment',
  target: { targetType: 'collectibles_pack', targetId: 'sample-pack-ember' },
  author: alex,
  text: 'Great pull!',
  createdAt: '2026-11-05T11:02:00Z',
  parentId: null,
};

const socialContext: PackSocialContext = {
  friends: [maya, alex],
  topBuyer: maya,
  lastFriendEpic: post,
  friendOpenings: 12,
};

const pokedex: Pokedex = {
  completedCount: 1,
  totalCount: 1025,
  entries: [
    {
      id: 252,
      name: 'Treecko',
      generation: 3,
      imageUrl:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/252.png',
      unlocked: true,
      firstOpenedAt: '2026-11-05T11:01:00Z',
      pullCount: 1,
      lastOpenedAt: '2026-11-05T11:01:00Z',
    },
  ],
};

/** Fixed Social API responses; commands do not simulate or persist backend state. */
export class MockCollectiblesSocialApiClient
  implements CollectiblesSocialApiClient
{
  async getPackSocialContext(
    request: Parameters<CollectiblesSocialApiClient['getPackSocialContext']>[0],
  ): ReturnType<CollectiblesSocialApiClient['getPackSocialContext']> {
    return Object.fromEntries(
      request.packTypes.map((packType) => [packType, socialContext]),
    );
  }

  async getLeaderboard(
    _request: Parameters<CollectiblesSocialApiClient['getLeaderboard']>[0],
  ): ReturnType<CollectiblesSocialApiClient['getLeaderboard']> {
    return {
      items: [
        {
          rank: 1,
          profile: maya,
          summary: {
            spentUsd: '2500',
            openedPackCount: 54,
            epicCount: 4,
            pokedexCompletedCount: 28,
            pokedexTotalCount: 1025,
          },
        },
        {
          rank: 2,
          profile: alex,
          summary: {
            spentUsd: '1875',
            openedPackCount: 32,
            epicCount: 2,
            pokedexCompletedCount: 20,
            pokedexTotalCount: 1025,
          },
        },
        {
          rank: 3,
          profile: collector,
          summary: {
            spentUsd: '275',
            openedPackCount: 8,
            epicCount: 1,
            pokedexCompletedCount: 3,
            pokedexTotalCount: 1025,
          },
        },
      ],
      nextCursor: null,
    };
  }

  async getFeed(
    _request: Parameters<CollectiblesSocialApiClient['getFeed']>[0],
  ): ReturnType<CollectiblesSocialApiClient['getFeed']> {
    return { items: [post, cardPost], nextCursor: null };
  }

  async getProfile(
    request: Parameters<CollectiblesSocialApiClient['getProfile']>[0],
  ): ReturnType<CollectiblesSocialApiClient['getProfile']> {
    const profiles: Record<string, CollectiblesSocialProfile> = {
      collector,
      maya,
      alex,
    };
    return profiles[request.profileId] ?? null;
  }

  async setFollow(
    request: Parameters<CollectiblesSocialApiClient['setFollow']>[0],
  ): ReturnType<CollectiblesSocialApiClient['setFollow']> {
    return {
      ...maya,
      profileId: request.profileId,
      isFollowing: request.following,
    };
  }

  async getProfileFavoritePacks(
    _request: Parameters<
      CollectiblesSocialApiClient['getProfileFavoritePacks']
    >[0],
  ): ReturnType<CollectiblesSocialApiClient['getProfileFavoritePacks']> {
    return [
      {
        packType: 'pack_partner:pokemon_25',
        packName: 'Pokémon Ember',
        openedCount: 18,
      },
      {
        packType: 'pack_partner:pokemon_50',
        packName: 'Pokémon Charged',
        openedCount: 12,
      },
    ];
  }

  async getProfileCollectibles(
    _request: Parameters<
      CollectiblesSocialApiClient['getProfileCollectibles']
    >[0],
  ): ReturnType<CollectiblesSocialApiClient['getProfileCollectibles']> {
    return { items: [pack], nextCursor: null };
  }

  async getProfilePokedex(
    _request: Parameters<CollectiblesSocialApiClient['getProfilePokedex']>[0],
  ): ReturnType<CollectiblesSocialApiClient['getProfilePokedex']> {
    return pokedex;
  }

  async getComments(
    _request: Parameters<CollectiblesSocialApiClient['getComments']>[0],
  ): ReturnType<CollectiblesSocialApiClient['getComments']> {
    return { items: [comment], nextCursor: null };
  }

  async addComment(
    request: Parameters<CollectiblesSocialApiClient['addComment']>[0],
  ): ReturnType<CollectiblesSocialApiClient['addComment']> {
    return {
      ...comment,
      target: { targetType: request.targetType, targetId: request.targetId },
      author: collector,
      text: request.text,
      parentId: request.parentId ?? null,
    };
  }

  async setReaction(
    request: Parameters<CollectiblesSocialApiClient['setReaction']>[0],
  ): ReturnType<CollectiblesSocialApiClient['setReaction']> {
    return {
      ...post,
      engagement: { likes: 25, comments: 1, likedByViewer: request.liked },
    };
  }

  async shareCards(
    request: Parameters<CollectiblesSocialApiClient['shareCards']>[0],
  ): ReturnType<CollectiblesSocialApiClient['shareCards']> {
    return { ...cardPost, itemId: request.draftId };
  }
}
