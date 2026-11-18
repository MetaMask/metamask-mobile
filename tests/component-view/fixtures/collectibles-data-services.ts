import type { Json } from '@metamask/utils';
import type {
  CollectiblesBuyback,
  CollectiblesCard,
  CollectiblesPack,
  CollectiblesInventoryPage,
  CollectiblesInventoryCard,
  CollectiblesOpening,
} from '../../../app/components/UI/Collectibles/types';
import type { PackPartnerOpeningFilters } from '../../../app/components/UI/Collectibles/providers/pack-partner/types/openings';

const PACK_PARTNER = 'PackPartnerDataService';

/**
 * PackPartner's answers to the `PackPartnerDataService` reads, one mock
 * per read, called with the read's parameters after the environment. An
 * answer configured on a mock always wins; a mock without an answer serves
 * the data passed to `serveOwnedCards` / `serveBuybackOffers` /
 * `serveRecentOpenings`, else nothing: no pack, an empty pool, no owned card,
 * no offer and no opening. Reset before each test.
 */
export const packPartnerReads = {
  getPacks: jest.fn<Promise<CollectiblesPack[]>, []>(),
  getPackInventory: jest.fn<
    Promise<CollectiblesInventoryPage>,
    [packCode: string, cursor?: string | null]
  >(),
  getGreatestHits: jest.fn<Promise<CollectiblesInventoryCard[]>, []>(),
  getOwnedCards: jest.fn<Promise<CollectiblesCard[]>, [address: string]>(),
  getBuybackOffer: jest.fn<Promise<CollectiblesBuyback>, [mint: string]>(),
  getRecentOpenings: jest.fn<
    Promise<CollectiblesOpening[]>,
    [filters: PackPartnerOpeningFilters]
  >(),
};

const servedOwnedCards = new Map<string, CollectiblesCard[]>();
const servedOffers = new Map<string, CollectiblesBuyback>();
const servedOpenings = new Map<string, CollectiblesOpening[]>();

/**
 * Sets the cards PackPartner reports for a wallet, newest first, as
 * `getOwnedCards` returns them. Replaces the previous list of that wallet.
 *
 * @param address - Solana address of the wallet.
 * @param cards - Owned cards.
 */
export const serveOwnedCards = (
  address: string,
  cards: CollectiblesCard[],
): void => {
  servedOwnedCards.set(address, cards);
};

/**
 * Sets PackPartner's current buyback offers, by mint, as
 * `getBuybackOffer` returns them. A mint without an offer is unavailable.
 *
 * @param offers - Offers by mint.
 */
export const serveBuybackOffers = (
  offers: Record<string, CollectiblesBuyback>,
): void => {
  Object.entries(offers).forEach(([mint, offer]) =>
    servedOffers.set(mint, offer),
  );
};

/**
 * Sets the REST snapshot of a pack's latest public openings, newest first, as
 * `getRecentOpenings` returns it. An empty code is the every-pack feed.
 *
 * @param packCode - Pack machine code, empty for every pack.
 * @param openings - Openings of the snapshot.
 */
export const serveRecentOpenings = (
  packCode: string,
  openings: CollectiblesOpening[],
): void => {
  servedOpenings.set(packCode, openings);
};

beforeEach(() => {
  Object.values(packPartnerReads).forEach((read) => read.mockReset());
  servedOwnedCards.clear();
  servedOffers.clear();
  servedOpenings.clear();
});

/**
 * The answer a test configured on a read mock, else its default.
 *
 * @param answer - Return value of the read mock, undefined without an answer.
 * @param fallback - Default answer.
 * @returns The answer.
 */
const answerWith = (
  answer: Promise<unknown> | undefined,
  fallback: () => unknown,
): Promise<unknown> => answer ?? Promise.resolve(fallback());

/**
 * Answers one PackPartner read, the environment already dropped.
 *
 * @param method - `PackPartnerDataService` read name.
 * @param params - Read parameters after the environment.
 * @returns The read result.
 */
const readPackPartner = (
  method: string,
  params: unknown[],
): Promise<unknown> => {
  switch (method) {
    case 'getPacks':
      return answerWith(packPartnerReads.getPacks(), () => []);
    case 'getGreatestHits':
      return answerWith(packPartnerReads.getGreatestHits(), () => []);
    case 'getPackInventory': {
      const [packCode, cursor] = params as [string, string | null | undefined];
      return answerWith(
        packPartnerReads.getPackInventory(packCode, cursor),
        () => ({ cards: [] }),
      );
    }
    case 'getOwnedCards': {
      const [address] = params as [string];
      return answerWith(
        packPartnerReads.getOwnedCards(address),
        () => servedOwnedCards.get(address) ?? [],
      );
    }
    case 'getBuybackOffer': {
      const [mint] = params as [string];
      return answerWith(
        packPartnerReads.getBuybackOffer(mint),
        () => servedOffers.get(mint) ?? { status: 'unavailable' },
      );
    }
    case 'getRecentOpenings': {
      const [filters] = params as [PackPartnerOpeningFilters];
      return answerWith(
        packPartnerReads.getRecentOpenings(filters),
        () => servedOpenings.get(filters.packType ?? '') ?? [],
      );
    }
    default:
      return Promise.reject(
        new Error(`Missing Collectibles fixture: ${method}`),
      );
  }
};

/** Test-only adapter for domain fixtures, used through the production query descriptors. */
export async function callCollectiblesFixture(
  action: string,
  ...args: unknown[]
): Promise<Json> {
  const [service, method] = action.split(':');
  if (method === 'invalidateQueries') return null;
  if (service === PACK_PARTNER) {
    return (await readPackPartner(method, args.slice(1))) as Json;
  }
  throw new Error(`Unknown PackPartner fixture action: ${action}`);
}
