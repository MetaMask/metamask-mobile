import type {
  CollectiblesApiClient,
  IndexedPack,
  PackInsights,
  Pokedex,
  WalletSummary,
} from './CollectiblesApiClient';

const pack: IndexedPack = {
  packId: 'sample-pack-ember',
  revision: 2,
  chainId: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  packType: 'pack_partner:pokemon_25',
  packName: 'Pokémon Ember',
  status: 'opened',
  buyer: { namespace: 'solana', address: 'sample-collector' },
  recipient: { namespace: 'solana', address: 'sample-collector' },
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

const summary: WalletSummary = {
  spentUsd: '275',
  openedPackCount: 8,
  epicCount: 1,
  pokedexCompletedCount: 3,
  pokedexTotalCount: 1025,
};

const pokedex: Pokedex = {
  completedCount: 3,
  totalCount: 1025,
  entries: [
    {
      id: 1,
      name: 'Bulbasaur',
      generation: 1,
      imageUrl:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
      unlocked: false,
      firstOpenedAt: null,
      pullCount: 0,
      lastOpenedAt: null,
    },
    {
      id: 3,
      name: 'Venusaur',
      generation: 1,
      imageUrl:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png',
      unlocked: true,
      firstOpenedAt: '2026-11-02T11:00:00Z',
      pullCount: 2,
      lastOpenedAt: '2026-11-04T11:00:00Z',
    },
    {
      id: 151,
      name: 'Mew',
      generation: 1,
      imageUrl:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png',
      unlocked: true,
      firstOpenedAt: '2026-11-03T11:00:00Z',
      pullCount: 1,
      lastOpenedAt: '2026-11-03T11:00:00Z',
    },
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

const insights: Record<string, PackInsights> = {
  'pack_partner:pokemon_25': {
    openedLast7d: 128,
    pulledSinceLastEpic: 14,
    rarityCounts24h: { common: 18, uncommon: 5, rare: 2, epic: 1 },
  },
  'pack_partner:pokemon_50': {
    openedLast7d: 94,
    pulledSinceLastEpic: 8,
    rarityCounts24h: { common: 12, uncommon: 4, rare: 1, epic: 1 },
  },
  'pack_partner:pokemon_100': {
    openedLast7d: 62,
    pulledSinceLastEpic: 21,
    rarityCounts24h: { common: 8, uncommon: 3, rare: 1, epic: 0 },
  },
  'pack_partner:onepiece_50': {
    openedLast7d: 51,
    pulledSinceLastEpic: 6,
    rarityCounts24h: { common: 7, uncommon: 2, rare: 1, epic: 1 },
  },
};

/** Static transport responses until the Collectibles API is available. */
export class MockCollectiblesApiClient implements CollectiblesApiClient {
  async getPackInsights(
    request: Parameters<CollectiblesApiClient['getPackInsights']>[0],
  ): ReturnType<CollectiblesApiClient['getPackInsights']> {
    return Object.fromEntries(
      request.packTypes.map((packType) => [
        packType,
        insights[packType] ?? insights['pack_partner:pokemon_25'],
      ]),
    );
  }

  async getLastOpened(
    request: Parameters<CollectiblesApiClient['getLastOpened']>[0],
  ): ReturnType<CollectiblesApiClient['getLastOpened']> {
    return Object.fromEntries(
      request.cardIds.map((cardId) => [
        cardId,
        {
          packId: 'sample-pack-ember',
          recipient: {
            namespace: 'solana' as const,
            address: 'sample-collector',
          },
          openedAt: '2026-11-05T11:01:00Z',
        },
      ]),
    );
  }

  async getWalletHistory(
    _request: Parameters<CollectiblesApiClient['getWalletHistory']>[0],
  ): ReturnType<CollectiblesApiClient['getWalletHistory']> {
    return {
      items: [
        pack,
        {
          ...pack,
          packId: 'sample-pack-sold',
          revision: 3,
          status: 'bought_back',
          buyback: {
            occurredAt: '2026-11-04T12:00:00Z',
            transactionId: 'sample-buyback',
            amount: '11050000',
            token: { id: 'sample-usdc', decimals: 6 },
            amountUsd: '11.05',
          },
          card: {
            cardId: 'sample-card-venusaur',
            name: 'Japanese Base Set',
            imageUrl:
              'https://d1xpxki1g4htqu.cloudfront.net/GZb8bJ4ZIb5bsbgeLZfCuIibQS1hB-ojEAwAiA45tnc',
            thumbnailUrl:
              'https://d1xpxki1g4htqu.cloudfront.net/GZb8bJ4ZIb5bsbgeLZfCuIibQS1hB-ojEAwAiA45tnc',
            rarity: 'common',
            insuredValue: '13',
            pokedexEntryId: 3,
            grade: 'PSA 10',
          },
        },
      ],
      nextCursor: null,
    };
  }

  async getPokedex(
    _request: Parameters<CollectiblesApiClient['getPokedex']>[0],
  ): ReturnType<CollectiblesApiClient['getPokedex']> {
    return pokedex;
  }

  async getWalletSummary(
    _request: Parameters<CollectiblesApiClient['getWalletSummary']>[0],
  ): ReturnType<CollectiblesApiClient['getWalletSummary']> {
    return summary;
  }
}
