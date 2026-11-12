/** Collectibles API transport contracts. */
export interface CollectiblesAccount {
  namespace: 'solana';
  address: string;
}
export type CollectiblesRarity = 'common' | 'uncommon' | 'rare' | 'epic';
export type RarityCounts = Record<CollectiblesRarity, number>;
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
export interface PageRequest {
  cursor?: string;
  limit?: number;
}
export interface IndexedCard {
  cardId: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string;
  rarity: CollectiblesRarity;
  insuredValue: string | null;
  pokedexEntryId: number | null;
  grade: string | null;
}
export interface IndexedPayment {
  occurredAt: string;
  transactionId: string;
  /** Integer token base units; monetary values are never floating point. */
  amount: string;
  token: { id: string; decimals: number };
  amountUsd: string | null;
}
export interface IndexedPack {
  packId: string;
  revision: number;
  chainId: string;
  /** Opaque provider-qualified pack type. Do not parse this identifier. */
  packType: string;
  packName: string;
  status: 'purchased' | 'opened' | 'bought_back';
  buyer: CollectiblesAccount | null;
  recipient: CollectiblesAccount | null;
  purchase: IndexedPayment | null;
  opening: { occurredAt: string; transactionId: string } | null;
  buyback: IndexedPayment | null;
  card: IndexedCard | null;
  turbo: boolean;
  enrichmentStatus: 'pending' | 'complete';
}
export interface PackInsights {
  openedLast7d: number;
  pulledSinceLastEpic: number;
  rarityCounts24h: RarityCounts;
}
export interface LastOpened {
  packId: string;
  recipient: CollectiblesAccount | null;
  openedAt: string;
}
export interface WalletSummary {
  spentUsd: string | null;
  openedPackCount: number;
  epicCount: number;
  pokedexCompletedCount: number;
  pokedexTotalCount: number;
}
export interface PokedexEntry {
  id: number;
  name: string;
  generation: number;
  imageUrl: string;
  unlocked: boolean;
  firstOpenedAt: string | null;
  /** Number of indexed openings of this species by the requested recipients. */
  pullCount?: number;
  lastOpenedAt?: string | null;
}
export interface Pokedex {
  entries: PokedexEntry[];
  completedCount: number;
  totalCount: number;
}
export interface CollectiblesApiClient {
  /** Client façade batches the per-pack since-last-Epic endpoint from ADR 0070. */
  getPackInsights(request: {
    packTypes: string[];
  }): Promise<Record<string, PackInsights>>;
  getLastOpened(request: {
    cardIds: string[];
  }): Promise<Record<string, LastOpened | null>>;
  getWalletHistory(
    request: PageRequest & {
      account: CollectiblesAccount;
      status?: IndexedPack['status'];
    },
  ): Promise<Page<IndexedPack>>;
  getPokedex(request: {
    accounts: CollectiblesAccount[];
    generation?: number;
  }): Promise<Pokedex>;
  getWalletSummary(request: {
    accounts: CollectiblesAccount[];
  }): Promise<WalletSummary>;
}
